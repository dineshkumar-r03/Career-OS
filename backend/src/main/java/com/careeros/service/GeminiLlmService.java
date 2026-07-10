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
        log.info("Resolving API Key. configuredApiKey length: {}, env key present: {}", 
                 configuredApiKey != null ? configuredApiKey.length() : 0, 
                 System.getenv("GEMINI_API_KEY") != null);
        String apiKey = getApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not set. Falling back to mock streaming response.");
            streamMockResponse(userMessage, handler);
            return;
        }

        executorService.submit(() -> {
            try {
                String urlStr = "https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:streamGenerateContent?key=" + apiKey;
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

                // Add system instruction as prefix turns in the contents list (for stable v1 compatibility)
                if (systemInstruction != null && !systemInstruction.trim().isEmpty()) {
                    Map<String, Object> sysPart = new HashMap<>();
                    sysPart.put("text", "System Guideline: " + systemInstruction);
                    Map<String, Object> sysContent = new HashMap<>();
                    sysContent.put("role", "user");
                    sysContent.put("parts", Collections.singletonList(sysPart));

                    Map<String, Object> ackPart = new HashMap<>();
                    ackPart.put("text", "Understood. I will act as your AI Career Mentor according to those guidelines.");
                    Map<String, Object> ackContent = new HashMap<>();
                    ackContent.put("role", "model");
                    ackContent.put("parts", Collections.singletonList(ackPart));

                    contents.add(0, sysContent);
                    contents.add(1, ackContent);
                }

                payload.put("contents", contents);
                String jsonPayload = objectMapper.writeValueAsString(payload);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                if (responseCode != 200) {
                    StringBuilder errorDetail = new StringBuilder();
                    try (var errStream = conn.getErrorStream()) {
                        if (errStream != null) {
                            try (BufferedReader errBr = new BufferedReader(new InputStreamReader(errStream, StandardCharsets.UTF_8))) {
                                String errLine;
                                while ((errLine = errBr.readLine()) != null) {
                                    errorDetail.append(errLine).append("\n");
                                }
                            }
                        }
                    } catch (Exception errEx) {
                        errorDetail.append("Could not read error stream: ").append(errEx.getMessage());
                    }
                    log.error("Gemini API stream returned error code: {}. Details:\n{}", responseCode, errorDetail.toString());
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
        try {
            Properties props = new Properties();
            try (var is = getClass().getClassLoader().getResourceAsStream("application.properties")) {
                if (is != null) {
                    props.load(is);
                    String key = props.getProperty("gemini.api.key");
                    if (key != null && !key.trim().isEmpty()) {
                        log.info("Successfully loaded gemini.api.key manually from application.properties");
                        return key.trim();
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to load application.properties manually", e);
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
                } else if (promptLower.matches(".*\\b(hi|hello|hey|greetings|hola|wasup)\\b.*")) {
                    responseText = "Hello! I am your AI Career Mentor. How can I help you with your career goals today? You can ask me to run a mock interview, suggest projects, analyze skills, or answer any engineering questions.";
                } else if (promptLower.contains("garbage") || promptLower.contains("gc") || promptLower.contains("memory")) {
                    responseText = "Garbage Collection (GC) in Java is the JVM's automatic memory management process. It heap-scans for unreferenced objects and frees up space.\n\n" +
                            "### Key Java GC Concepts:\n" +
                            "- **Generational Heap**: Divided into Young Generation (Eden, S1, S2) and Old Generation.\n" +
                            "- **GC Algorithms**: G1 (Garbage First), ZGC (ultra-low latency), and Parallel GC.\n" +
                            "- **System.gc()**: Suggests JVM to run GC, but does not guarantee immediate collection. Avoid using this in production code.\n\n" +
                            "Would you like me to quiz you on Java Memory Management or suggest a project practicing garbage tuning?";
                } else if (promptLower.contains("spring") || promptLower.contains("jpa") || promptLower.contains("database") || promptLower.contains("sql")) {
                    responseText = "Spring Boot and JPA/Hibernate provide powerful abstraction layers for relational databases. Here are key database practices:\n\n" +
                            "- **N+1 Query Problem**: Avoid by using `@EntityGraph` or `JOIN FETCH` queries.\n" +
                            "- **Transaction Propagation**: `@Transactional` defaults to `REQUIRED`, which joins an existing transaction or creates a new one.\n" +
                            "- **Index Optimization**: Always index columns frequently used in WHERE, JOIN, and ORDER BY clauses.\n\n" +
                            "Do you want to discuss Spring Boot REST controllers or database scaling next?";
                } else if (promptLower.contains("resume") || promptLower.contains("cv") || promptLower.contains("linkedin")) {
                    responseText = "Optimizing your resume and LinkedIn profile is critical to getting recruiters' attention. Here are three key strategies:\n\n" +
                            "1. **Use Action Verbs**: Start bullets with strong action words like 'Designed', 'Architected', 'Optimized', or 'Led'.\n" +
                            "2. **Quantify Impact**: Instead of 'fixed bugs', write 'resolved 50+ critical errors, reducing application crash rate by 18%'.\n" +
                            "3. **Match Keywords**: Ensure skills in your profile (e.g. React, Spring Boot, Java) match target job descriptions.\n\n" +
                            "I can help you review a bullet point. Paste one here and we can optimize it together!";
                } else {
                    // Dynamic fallback extracting user's topic
                    String topic = "your career path";
                    String[] words = userMessage.split("\\s+");
                    List<String> ignored = Arrays.asList("about", "would", "could", "should", "there", "their", "these", "those", "which", "where", "write", "please", "answer", "question");
                    for (String w : words) {
                        String clean = w.replaceAll("[^a-zA-Z0-9]", "");
                        if (clean.length() > 4 && !ignored.contains(clean.toLowerCase())) {
                            topic = clean;
                            break;
                        }
                    }
                    responseText = "I hear you! You asked about **" + topic + "**. As your AI Career Mentor, I suggest keeping these principles in mind:\n\n" +
                            "- **Identify the Core Goal**: How does " + topic + " align with your target career role (e.g. Backend Developer, UI Specialist)?\n" +
                            "- **Hands-on Practice**: The single best way to master " + topic + " is by writing code, setting up a sample repository, and deploying it.\n" +
                            "- **Community Review**: Share your design or code with peers on CareerOS, gather comments, and read related articles.\n\n" +
                            "*(Note: To unlock live unrestricted conversational answers powered by Gemini, make sure to add your `GEMINI_API_KEY` to the environment variables or `application.properties`!)*\n\n" +
                            "How else can I assist you with " + topic + " or your career preparation?";
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
