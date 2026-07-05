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
import java.io.Reader;
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

                // Add systemInstruction as a top-level property for native API compliance and stricter adherence
                if (systemInstruction != null && !systemInstruction.trim().isEmpty()) {
                    Map<String, Object> sysInstructionMap = new HashMap<>();
                    Map<String, Object> sysPart = new HashMap<>();
                    sysPart.put("text", systemInstruction);
                    sysInstructionMap.put("parts", Collections.singletonList(sysPart));
                    payload.put("systemInstruction", sysInstructionMap);
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

                // Read stream character-by-character using a robust JSON string extractor state machine
                try (Reader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    final int STATE_SEARCH_KEY = 0;
                    final int STATE_FIND_COLON = 1;
                    final int STATE_FIND_QUOTE = 2;
                    final int STATE_READ_STRING = 3;

                    int state = STATE_SEARCH_KEY;
                    int keyMatchIdx = 0;
                    final String keyTarget = "\"text\"";
                    boolean escaped = false;
                    int unicodeRemaining = 0;
                    StringBuilder unicodeHex = new StringBuilder();
                    StringBuilder chunkBuffer = new StringBuilder();

                    int r;
                    while ((r = reader.read()) != -1) {
                        char c = (char) r;
                        switch (state) {
                            case STATE_SEARCH_KEY:
                                if (c == keyTarget.charAt(keyMatchIdx)) {
                                    keyMatchIdx++;
                                    if (keyMatchIdx == keyTarget.length()) {
                                        state = STATE_FIND_COLON;
                                    }
                                } else {
                                    keyMatchIdx = (c == '"') ? 1 : 0;
                                }
                                break;

                            case STATE_FIND_COLON:
                                if (Character.isWhitespace(c)) {
                                    // skip whitespace
                                } else if (c == ':') {
                                    state = STATE_FIND_QUOTE;
                                } else {
                                    state = STATE_SEARCH_KEY;
                                    keyMatchIdx = (c == '"') ? 1 : 0;
                                }
                                break;

                            case STATE_FIND_QUOTE:
                                if (Character.isWhitespace(c)) {
                                    // skip whitespace
                                } else if (c == '"') {
                                    state = STATE_READ_STRING;
                                    escaped = false;
                                    unicodeRemaining = 0;
                                    chunkBuffer.setLength(0);
                                } else {
                                    state = STATE_SEARCH_KEY;
                                    keyMatchIdx = (c == '"') ? 1 : 0;
                                }
                                break;

                            case STATE_READ_STRING:
                                if (escaped) {
                                    if (unicodeRemaining > 0) {
                                        unicodeHex.append(c);
                                        unicodeRemaining--;
                                        if (unicodeRemaining == 0) {
                                            try {
                                                int hexVal = Integer.parseInt(unicodeHex.toString(), 16);
                                                chunkBuffer.append((char) hexVal);
                                            } catch (NumberFormatException e) {
                                                chunkBuffer.append("\\u").append(unicodeHex);
                                            }
                                            escaped = false;
                                        }
                                    } else {
                                        switch (c) {
                                            case 'n': chunkBuffer.append('\n'); escaped = false; break;
                                            case 't': chunkBuffer.append('\t'); escaped = false; break;
                                            case 'r': chunkBuffer.append('\r'); escaped = false; break;
                                            case 'b': chunkBuffer.append('\b'); escaped = false; break;
                                            case 'f': chunkBuffer.append('\f'); escaped = false; break;
                                            case '"': chunkBuffer.append('"'); escaped = false; break;
                                            case '\\': chunkBuffer.append('\\'); escaped = false; break;
                                            case '/': chunkBuffer.append('/'); escaped = false; break;
                                            case 'u': 
                                                unicodeRemaining = 4; 
                                                unicodeHex.setLength(0); 
                                                break;
                                            default:
                                                chunkBuffer.append('\\').append(c);
                                                escaped = false;
                                                break;
                                        }
                                    }
                                } else {
                                    if (c == '\\') {
                                        escaped = true;
                                    } else if (c == '"') {
                                        if (chunkBuffer.length() > 0) {
                                            handler.onChunk(chunkBuffer.toString());
                                        }
                                        state = STATE_SEARCH_KEY;
                                        keyMatchIdx = 0;
                                    } else {
                                        chunkBuffer.append(c);
                                    }
                                }
                                break;
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
                    responseText = "Hello! Preparing for interviews can feel daunting, but structuring your preparation will make a massive difference.\n\n" +
                            "## Key Points\n" +
                            "- **Technical Fundamentals**: Make sure you can comfortably code basic data structures, explain algorithms, and explain architectural choices.\n" +
                            "- **Spring IoC & Dependency Injection**: Be ready to explain how `@Autowired` works under the hood and beans lifecycle.\n" +
                            "- **Transaction Management**: Understand `@Transactional` propagation levels and rollback limits.\n" +
                            "- **OOP Design Patterns**: Be ready to code Singleton, Factory, and Builder patterns.\n" +
                            "- **STAR Method for Behavioral Questions**: Structure answers using Situation, Task, Action, and Result with quantitative metrics.\n\n" +
                            "## Core Keywords/Concepts\n" +
                            "- Spring IoC\n" +
                            "- Dependency Injection\n" +
                            "- Transaction Propagation\n" +
                            "- Design Patterns\n" +
                            "- STAR Methodology";
                } else if (promptLower.contains("skills") || promptLower.contains("gap") || promptLower.contains("improve")) {
                    responseText = "Let's review your skills gap analysis. Looking at your current profile, you have solid foundations in frontend concepts, but we should optimize your backend capabilities:\n\n" +
                            "## Key Points\n" +
                            "- **Advanced SQL & Databases**: Get comfortable with table indexing, explain query plans, and JPA/Hibernate lazy-loading.\n" +
                            "- **Distributed Systems**: Learn REST API design contract guidelines, gateway patterns, and Redis caching.\n" +
                            "- **DevOps & Cloud**: Understand container configurations (Dockerfiles) and basic cloud deployment (AWS EC2, RDS).\n\n" +
                            "## Core Keywords/Concepts\n" +
                            "- Database Indexing\n" +
                            "- Hibernate Lazy Loading\n" +
                            "- Microservices Patterns\n" +
                            "- Redis Cache\n" +
                            "- Docker Containerization";
                } else if (promptLower.contains("project") || promptLower.contains("portfolio")) {
                    responseText = "Building portfolio projects is the single best way to prove your engineering capability. Here are premium project blueprints:\n\n" +
                            "## Key Points\n" +
                            "- **Collaborative Real-time Board**: Build a workspace management board supporting real-time drag-and-drop updates using WebSockets, JWT, and PostgreSQL.\n" +
                            "- **Distributed E-Commerce Backend**: Write microservices (Order, Inventory, Product) communicating via FeignClient and Kafka.\n" +
                            "- **Skills Developed**: Practicing database relations, transaction boundaries, circuit breakers, and state synchronization.\n\n" +
                            "## Core Keywords/Concepts\n" +
                            "- Real-time WebSockets\n" +
                            "- Microservices Architecture\n" +
                            "- Kafka Event Streaming\n" +
                            "- Resilience4j Circuit Breakers\n" +
                            "- JWT Security Authentication";
                } else if (promptLower.matches(".*\\b(hi|hello|hey|greetings|hola|wasup)\\b.*")) {
                    responseText = "Hello! I am your AI Career Mentor. How can I help you with your career goals today?\n\n" +
                            "## Key Points\n" +
                            "- **Interactive Coaching**: Ask me to run mock interviews or prepare questions.\n" +
                            "- **Portfolio Blueprinting**: Request suggestions for custom coding projects.\n" +
                            "- **Skills Gap Analysis**: We can identify what you need to learn to land your dream role.\n\n" +
                            "## Core Keywords/Concepts\n" +
                            "- Interview Preparation\n" +
                            "- Skills Assessment\n" +
                            "- Project Design\n" +
                            "- Career Coaching";
                } else if (promptLower.contains("garbage") || promptLower.contains("gc") || promptLower.contains("memory")) {
                    responseText = "Garbage Collection (GC) in Java is the JVM's automatic memory management process.\n\n" +
                            "## Key Points\n" +
                            "- **Generational Heap**: Heap memory is divided into Young Generation (Eden, S0, S1) and Old Generation.\n" +
                            "- **GC Algorithms**: Learn G1 (Garbage First), ZGC (ultra-low latency), and Parallel GC.\n" +
                            "- **Avoid System.gc()**: Suggests JVM to run GC, but does not guarantee immediate collection. Do not use this in production code.\n\n" +
                            "## Core Keywords/Concepts\n" +
                            "- JVM Memory Management\n" +
                            "- Generational Heap\n" +
                            "- Garbage First (G1) GC\n" +
                            "- Z Garbage Collector (ZGC)\n" +
                            "- System.gc()";
                } else if (promptLower.contains("spring") || promptLower.contains("jpa") || promptLower.contains("database") || promptLower.contains("sql")) {
                    responseText = "Spring Boot and JPA/Hibernate provide powerful abstraction layers for relational databases.\n\n" +
                            "## Key Points\n" +
                            "- **N+1 Query Problem**: Avoid by using `@EntityGraph` or `JOIN FETCH` queries.\n" +
                            "- **Transaction Propagation**: `@Transactional` defaults to `REQUIRED`, which joins an existing transaction or creates a new one.\n" +
                            "- **Index Optimization**: Always index columns frequently used in WHERE, JOIN, and ORDER BY clauses.\n\n" +
                            "## Core Keywords/Concepts\n" +
                            "- Spring Boot Data JPA\n" +
                            "- Hibernate N+1 Problem\n" +
                            "- EntityGraph & JOIN FETCH\n" +
                            "- Transaction Propagation REQUIRED\n" +
                            "- SQL Index Optimization";
                } else if (promptLower.contains("resume") || promptLower.contains("cv") || promptLower.contains("linkedin")) {
                    responseText = "Optimizing your resume and LinkedIn profile is critical to getting recruiters' attention.\n\n" +
                            "## Key Points\n" +
                            "- **Use Action Verbs**: Start bullet points with strong words like 'Designed', 'Architected', or 'Optimized'.\n" +
                            "- **Quantify Impact**: Write 'resolved 50+ critical errors, reducing application crash rate by 18%' instead of 'fixed bugs'.\n" +
                            "- **Match Keywords**: Ensure skills in your profile match the target job description.\n\n" +
                            "## Core Keywords/Concepts\n" +
                            "- Resume Keywords\n" +
                            "- Action Verbs\n" +
                            "- Quantitative Impact\n" +
                            "- Profile Optimization";
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
                    responseText = "I hear you! You asked about **" + topic + "**. Here are key principles to keep in mind:\n\n" +
                            "## Key Points\n" +
                            "- **Identify the Core Goal**: How does " + topic + " align with your target career role?\n" +
                            "- **Hands-on Practice**: Master " + topic + " by writing code, setting up a sample repository, and deploying it.\n" +
                            "- **Community Review**: Share your design or code with peers, gather comments, and read related articles.\n" +
                            "- **API Setup Warning**: Make sure to add your `GEMINI_API_KEY` to unlock live conversational answers powered by Gemini.\n\n" +
                            "## Core Keywords/Concepts\n" +
                            "- " + topic + "\n" +
                            "- Goal Alignment\n" +
                            "- Practical Coding\n" +
                            "- Gemini API Key Configuration";
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
