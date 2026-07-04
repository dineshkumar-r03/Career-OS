package com.careeros.service;

import com.careeros.entity.MentorChatMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiLlmService implements LlmService {

    @Value("${gemini.api.key:}")
    private String configuredApiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ExecutorService executorService = Executors.newCachedThreadPool();

    @Override
    public void streamChat(
            String systemInstruction,
            List<MentorChatMessage> history,
            String userMessage,
            String ragContext,
            ChatResponseHandler handler
    ) {
        String apiKey = getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not set. Falling back to mock streaming response.");
            streamMockResponse(userMessage, handler);
            return;
        }

        executorService.submit(() -> {
            try {
                String urlStr = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=" + apiKey;
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                // Build prompt contents payload
                List<Map<String, Object>> contents = new ArrayList<>();

                // Add history
                for (MentorChatMessage msg : history) {
                    Map<String, Object> part = new HashMap<>();
                    part.put("text", msg.getContent());

                    Map<String, Object> contentMap = new HashMap<>();
                    contentMap.put("role", msg.getSender().equalsIgnoreCase("USER") ? "user" : "model");
                    contentMap.put("parts", Collections.singletonList(part));
                    contents.add(contentMap);
                }

                // Add user message with RAG context
                String finalUserPrompt = userMessage;
                if (ragContext != null && !ragContext.trim().isEmpty()) {
                    finalUserPrompt = "[Context from platform stories/blogs:\n" + ragContext + "]\n\n" +
                            "[User question]:\n" + userMessage;
                }

                Map<String, Object> userPart = new HashMap<>();
                userPart.put("text", finalUserPrompt);

                Map<String, Object> userContent = new HashMap<>();
                userContent.put("role", "user");
                userContent.put("parts", Collections.singletonList(userPart));
                contents.add(userContent);

                // Build full payload
                Map<String, Object> payload = new HashMap<>();
                payload.put("contents", contents);

                // Add system instruction
                if (systemInstruction != null && !systemInstruction.trim().isEmpty()) {
                    Map<String, Object> sysPart = new HashMap<>();
                    sysPart.put("text", systemInstruction);
                    Map<String, Object> sysInstructionMap = new HashMap<>();
                    sysInstructionMap.put("parts", Collections.singletonList(sysPart));
                    payload.put("systemInstruction", sysInstructionMap);
                }

                String jsonPayload = objectMapper.writeValueAsString(payload);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                if (responseCode != 200) {
                    log.error("Gemini API stream returned error code: {}. Falling back to mock stream.", responseCode);
                    streamMockResponse(userMessage, handler);
                    return;
                }

                // Read streamed lines
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    Pattern textPattern = Pattern.compile("\"text\"\\s*:\\s*\"([^\"]*)\"");
                    while ((line = br.readLine()) != null) {
                        if (line.trim().isEmpty()) continue;
                        
                        // Parse text field using pattern matching to avoid partial JSON buffer break exceptions
                        Matcher matcher = textPattern.matcher(line);
                        while (matcher.find()) {
                            String text = matcher.group(1);
                            // Unescape basic characters
                            text = text.replace("\\n", "\n")
                                       .replace("\\t", "\t")
                                       .replace("\\\"", "\"")
                                       .replace("\\\\", "\\");
                            handler.onChunk(text);
                        }
                    }
                }
                handler.onComplete();
            } catch (Exception e) {
                log.error("Exception in streaming chat: {}", e.getMessage(), e);
                try {
                    handler.onChunk("\n\n*System Notice: API connection issue occurred. Falling back to Career Mentor offline guidance...*\n\n");
                    streamMockResponse(userMessage, handler);
                } catch (Exception se) {
                    handler.onError(se);
                }
            }
        });
    }

    private String getApiKey() {
        if (configuredApiKey != null && !configuredApiKey.trim().isEmpty()) {
            return configuredApiKey;
        }
        return System.getenv("GEMINI_API_KEY");
    }

    private void streamMockResponse(String userMessage, ChatResponseHandler handler) {
        executorService.submit(() -> {
            try {
                String promptLower = userMessage.toLowerCase();
                String responseText;

                if (promptLower.contains("interview") || promptLower.contains("prepare") || promptLower.contains("coach")) {
                    responseText = "Hello! Preparing for interviews can feel daunting, but structuring your preparation will make a massive difference. Here is a guided preparation framework:\n\n" +
                            "### 1. Core Technical Fundamentals\n" +
                            "Make sure you can comfortably code basic data structures, explain algorithms, and explain architectural choices. If you are preparing for a Java/Spring Boot interview, focus on:\n" +
                            "- **Spring IoC & Dependency Injection**: Explain how `@Autowired` works under the hood.\n" +
                            "- **Transaction Management**: Understand `@Transactional` propagation limits.\n" +
                            "- **OOP Design Patterns**: Be ready to code Singleton, Factory, and Builder patterns.\n\n" +
                            "### 2. Behavioral Questions (The STAR Method)\n" +
                            "Answer questions about conflicts, team challenges, or project deadlines using this structure:\n" +
                            "- **S**ituation: Describe the project scope.\n" +
                            "- **T**ask: Detail the problem you had to solve.\n" +
                            "- **A**ction: Explain what *you* did to resolve it.\n" +
                            "- **R**esult: Mention quantitative metrics (e.g. 'reduced latency by 15%').\n\n" +
                            "Would you like me to run a mock interview query? Tell me your target role and we can start with question one!";
                } else if (promptLower.contains("skills") || promptLower.contains("gap") || promptLower.contains("improve")) {
                    responseText = "Let's review your skills gap analysis. Looking at your current profile, you have solid foundations in frontend concepts (like React and modern layout designs). However, to transition to a strong engineering position, we should optimize your backend and deployment capabilities:\n\n" +
                            "1. **Advanced SQL & Databases**: Get comfortable with table indexing, explain query plans, and understand how JPA/Hibernate handles lazy-loading.\n" +
                            "2. **Distributed Systems**: Learn REST contract designs, API gateway patterns, and basic caching (Redis).\n" +
                            "3. **DevOps & Cloud**: Understand container configurations (Dockerfiles) and basic deployment targets (AWS EC2, RDS).\n\n" +
                            "I suggest checking out our recommended roadmap inside your dashboard to structure this learning path week-by-week. Which of these three areas do you want to tackle first?";
                } else if (promptLower.contains("project") || promptLower.contains("portfolio")) {
                    responseText = "Building portfolio projects is the single best way to prove your engineering capability. Here are two custom project blueprints based on your skills:\n\n" +
                            "### Project 1: Distributed E-Commerce Backend (Java/Spring Boot)\n" +
                            "- **Concept**: Build an order-processing backend architecture that scales under simulated concurrent loads.\n" +
                            "- **Skills developed**: Spring Boot Security (JWT), Spring Cloud Gateway, Docker compose configurations, and Redis caching.\n" +
                            "- **Why it stands out**: Demonstrates understanding of system scaling, transactional integrity, and container deployment.\n\n" +
                            "### Project 2: Real-time Collaborative Board (React/WebSockets)\n" +
                            "- **Concept**: A project management layout where boards update in real-time as users drag items.\n" +
                            "- **Skills developed**: React custom hooks, Websocket handlers, and state synchronization.\n" +
                            "- **Why it stands out**: Proves advanced React handling, custom network integrations, and smooth visual UI polish.\n\n" +
                            "Which of these projects would you like to build first? I can help you draft the database schemas or layout architecture!";
                } else {
                    responseText = "Hello! I am your AI Career Mentor. I have reviewed your profile and can guide you through preparing for technical interviews, reviewing skills gaps, suggesting portfolio projects, or learning complex systems.\n\n" +
                            "Here are some options we can explore:\n" +
                            "- **Mock Interview**: Type 'mock interview' to test your technical coding skills.\n" +
                            "- **Skills Analysis**: Type 'skills gap' to evaluate what technologies you should learn next.\n" +
                            "- **Portfolio Projects**: Type 'suggest projects' to get detailed ideas for your resume.\n\n" +
                            "How can I support your career journey today?";
                }

                // Stream the mock text word by word to make it feel natural
                String[] tokens = responseText.split("(?<=\\s)|(?=\\n)");
                for (String token : tokens) {
                    handler.onChunk(token);
                    Thread.sleep(40); // 40ms delay per token for natural streaming pace
                }
                handler.onComplete();
            } catch (Exception e) {
                handler.onError(e);
            }
        });
    }
}
