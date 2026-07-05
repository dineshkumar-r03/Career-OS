package com.careeros.service;

import com.careeros.entity.Blog;
import com.careeros.entity.MentorChatMessage;
import com.careeros.entity.MentorChatSession;
import com.careeros.entity.User;
import com.careeros.repository.BlogRepository;
import com.careeros.repository.MentorChatMessageRepository;
import com.careeros.repository.MentorChatSessionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MentorService {

    private final MentorChatSessionRepository sessionRepository;
    private final MentorChatMessageRepository messageRepository;
    private final BlogRepository blogRepository;
    private final LlmService llmService;
    private final ObjectMapper objectMapper;

    public MentorChatSession createSession(User user, String title) {
        MentorChatSession session = new MentorChatSession();
        session.setUser(user);
        session.setTitle(title == null || title.trim().isEmpty() ? "New Mentor Conversation" : title);
        return sessionRepository.save(session);
    }

    public List<MentorChatSession> getSessions(User user) {
        return sessionRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional
    public void deleteSession(Long sessionId, User user) {
        MentorChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You do not own this session");
        }
        sessionRepository.delete(session);
    }

    public List<MentorChatMessage> getMessages(Long sessionId, User user) {
        MentorChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You do not own this session");
        }
        return messageRepository.findBySessionOrderByCreatedAtAsc(session);
    }

    @Transactional
    public void streamChatReply(Long sessionId, String userPrompt, User user, SseEmitter emitter) {
        MentorChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You do not own this session");
        }

        // 1. Save user message to database
        MentorChatMessage userMessage = new MentorChatMessage();
        userMessage.setSession(session);
        userMessage.setSender("USER");
        userMessage.setContent(userPrompt);
        messageRepository.save(userMessage);

        // Update session title if it was the default "New Mentor Conversation"
        if (session.getTitle().equals("New Mentor Conversation") || session.getTitle().equals("New Career Conversation")) {
            String titleSuggestion = userPrompt.length() > 30 ? userPrompt.substring(0, 27) + "..." : userPrompt;
            session.setTitle(titleSuggestion);
            sessionRepository.save(session);
        }

        // 2. Perform simple keyword-based RAG matching from platform blogs
        List<Blog> ragBlogs = getRagBlogs(userPrompt);
        
        // Emit stories JSON metadata first so the UI can update immediately
        try {
            List<com.careeros.dto.response.BlogResponse> blogResponses = ragBlogs.stream()
                    .map(com.careeros.dto.response.BlogResponse::fromBlog)
                    .collect(Collectors.toList());
            String json = objectMapper.writeValueAsString(blogResponses);
            emitter.send(SseEmitter.event().name("stories").data(json));
        } catch (Exception e) {
            log.error("Failed to emit stories event over SSE", e);
        }

        // Format RAG context for prompt
        String ragContext = ragBlogs.stream()
                .map(blog -> String.format("Story ID %d: '%s' in category '%s'. Excerpt: %s",
                        blog.getId(),
                        blog.getTitle(),
                        blog.getCategory() != null ? blog.getCategory() : "Technology",
                        blog.getContent().substring(0, Math.min(250, blog.getContent().length())).replaceAll("\\s+", " ").trim()))
                .collect(Collectors.joining("\n\n"));

        // 3. Compile history for context window
        List<MentorChatMessage> history = messageRepository.findBySessionOrderByCreatedAtAsc(session);
        // Exclude the last message which is the current user message, since we send it separately in streamChat
        if (!history.isEmpty()) {
            history.remove(history.size() - 1);
        }

        // 4. Construct System Instruction to configure the Mentor persona
        String systemInstruction = "You are CareerOS AI Mentor.\n\n" +
                "Always format your responses using Markdown.\n\n" +
                "Rules:\n" +
                "- Use headings (##)\n" +
                "- Use bullet points\n" +
                "- Use numbered lists for steps\n" +
                "- Separate paragraphs with blank lines\n" +
                "- Never return one large paragraph.\n" +
                "- Keep answers clean and readable.\n\n" +
                "You are an expert AI Career Mentor for the CareerOS platform. You have access to the user's profile details. Act as a personalized coach to:\n" +
                "- Answer career queries logically, with step-by-step actionable advice.\n" +
                "- Suggest relevant portfolio coding projects (detailing front/back tasks and tech).\n" +
                "- Provide interview preparation, run mock quizzes, or explain engineering concepts (like JPA, REST, React hooks).\n" +
                "- Reference the retrieved platform blogs/stories supplied in context to suggest further reading.\n\n" +
                "Formatting guidelines (CRITICAL):\n" +
                "- ALWAYS structure your response into two distinct, separate sections: '## Key Points' and '## Core Keywords/Concepts'.\n" +
                "- Under the '## Key Points' section, write your advice, steps, or explanations point-by-point using short, clear, and structured bullet points (-). Do not write long, dense paragraphs.\n" +
                "- Under the '## Core Keywords/Concepts' section, list the most critical technical terms, libraries, frameworks, concepts, or keywords relevant to the response as a bulleted vocabulary list.\n" +
                "- Use rich markdown syntax with descriptive subheaders (###), bullet lists (-), bold tags (**), and code blocks where appropriate.\n" +
                "- Keep explanations concise, technical, and actionable.\n" +
                "- Maintain a professional workspace coaching tone.";

        // 5. Invoke Modular LLM Stream
        StringBuilder aiReplyAccumulator = new StringBuilder();
        llmService.streamChat(systemInstruction, history, userPrompt, ragContext, new ChatResponseHandler() {
            @Override
            public void onChunk(String chunk) throws Exception {
                aiReplyAccumulator.append(chunk);
                Map<String, String> payload = Map.of("content", chunk);
                String json = objectMapper.writeValueAsString(payload);
                emitter.send(SseEmitter.event().data(json));
            }

            @Override
            public void onComplete() {
                try {
                    // Save response to DB on completion
                    MentorChatMessage aiMessage = new MentorChatMessage();
                    aiMessage.setSession(session);
                    aiMessage.setSender("AI");
                    aiMessage.setContent(aiReplyAccumulator.toString());
                    messageRepository.save(aiMessage);

                    emitter.complete();
                } catch (Exception e) {
                    log.error("Error finalizing SSE emitter stream completion", e);
                    emitter.completeWithError(e);
                }
            }

            @Override
            public void onError(Throwable t) {
                log.error("Error during LLM token streaming", t);
                emitter.completeWithError(t);
            }
        });
    }

    private List<Blog> getRagBlogs(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String[] words = prompt.split("\\s+");
        Set<String> keywords = new LinkedHashSet<>();
        List<String> stopWords = Arrays.asList("the", "and", "for", "you", "are", "with", "how", "what", "can", "help", "here", "this", "that", "your", "does", "explain", "mock", "about");
        
        for (String word : words) {
            String clean = word.replaceAll("[^a-zA-Z0-9#+]", "").trim();
            if (clean.length() >= 3) {
                String lower = clean.toLowerCase();
                if (!stopWords.contains(lower)) {
                    keywords.add(clean);
                }
            }
        }

        if (keywords.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> collectedIds = new HashSet<>();
        List<Blog> matchingBlogs = new ArrayList<>();
        int count = 0;

        for (String keyword : keywords) {
            if (count >= 3) break;
            Page<Blog> matches = blogRepository.search(keyword, PageRequest.of(0, 2));
            for (Blog blog : matches.getContent()) {
                if (!collectedIds.contains(blog.getId())) {
                    collectedIds.add(blog.getId());
                    matchingBlogs.add(blog);
                    count++;
                    if (count >= 3) break;
                }
            }
        }

        return matchingBlogs;
    }
}
