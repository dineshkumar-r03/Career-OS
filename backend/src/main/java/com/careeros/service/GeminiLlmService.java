package com.careeros.service;

import com.careeros.entity.MentorChatMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

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
        boolean isKeyLoaded = apiKey != null && !apiKey.trim().isEmpty();
        log.info("Gemini API key resolution: {}", isKeyLoaded ? "API KEY FOUND (length: " + apiKey.trim().length() + ")" : "API KEY NOT FOUND");

        if (!isKeyLoaded) {
            handler.onError(new RuntimeException("Gemini API key is not configured (API KEY NOT FOUND)."));
            return;
        }

        executorService.submit(() -> {
            try {
                String urlStr = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:streamGenerateContent?key=" + apiKey;
                String logUrl = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:streamGenerateContent?key=[PROTECTED]";
                
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

                // Add system instruction
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

                log.debug("Gemini Outgoing Request URL: {}", logUrl);
                log.debug("Gemini Outgoing Payload: {}", jsonPayload);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                log.debug("Gemini Response HTTP Status: {}", responseCode);

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
                    String errMessage = "Gemini API stream returned HTTP error " + responseCode + ". Details: " + errorDetail.toString();
                    log.error(errMessage);
                    handler.onError(new RuntimeException(errMessage));
                    return;
                }

                // Read streamed lines
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    Pattern textPattern = Pattern.compile("\"text\"\\s*:\\s*\"([^\"]*)\"");
                    while ((line = br.readLine()) != null) {
                        if (line.trim().isEmpty()) continue;
                        
                        log.debug("Gemini Stream Chunk Line: {}", line);
                        
                        Matcher matcher = textPattern.matcher(line);
                        while (matcher.find()) {
                            String text = matcher.group(1);
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
                handler.onError(e);
            }
        });
    }

    private String getApiKey() {
        if (configuredApiKey != null && !configuredApiKey.trim().isEmpty() && !configuredApiKey.contains("${")) {
            return configuredApiKey.trim();
        }
        return System.getenv("GEMINI_API_KEY");
    }
}
