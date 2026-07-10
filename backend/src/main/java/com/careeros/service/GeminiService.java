package com.careeros.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String configuredApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getCareerGuidance(
            String name,
            String college,
            String department,
            Integer graduationYear,
            String skills,
            String interests,
            String careerGoals
    ) {
        String apiKey = getApiKey();
        boolean isKeyLoaded = apiKey != null && !apiKey.trim().isEmpty();
        log.info("Gemini API key resolution: {}", isKeyLoaded ? "API KEY FOUND (length: " + apiKey.trim().length() + ")" : "API KEY NOT FOUND");

        if (!isKeyLoaded) {
            throw new RuntimeException("Gemini API key is not configured (API KEY NOT FOUND).");
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey;
            String logUrl = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=[PROTECTED]";

            String prompt = String.format(
                    "You are an expert AI Career Guidance Counselor. Make the suggestions detailed, custom, and highly relevant. All descriptions, reasons, and explanations must be returned as a list of 2-3 key points (each starting with a hyphen '-').\n" +
                            "Analyze the following student profile:\n" +
                            "- Name: %s\n" +
                            "- Education: Department of %s at %s (Graduation: %s)\n" +
                            "- Current Skills: %s\n" +
                            "- Career Interests: %s\n" +
                            "- Career Goals: %s\n\n" +
                            "Generate a highly personalized career guidance plan. Your response must be a single, valid JSON object containing exactly the following schema. Do not wrap the JSON in markdown blocks (like ```json), write raw JSON only:\n" +
                            "{\n" +
                            "  \"careerPaths\": [\n" +
                            "    {\n" +
                            "      \"title\": \"Career Path Title\",\n" +
                            "      \"description\": \"- Keypoint 1\\n- Keypoint 2\\n- Keypoint 3\",\n" +
                            "      \"matchRelevance\": 90,\n" +
                            "      \"outlook\": \"Growing / High Demand / Stable\",\n" +
                            "      \"entryRoles\": [\"Role A\", \"Role B\"],\n" +
                            "      \"referenceLinks\": [\n" +
                            "        {\n" +
                            "          \"title\": \"LinkedIn Jobs / Dev.to tag / Medium search\",\n" +
                            "          \"url\": \"https://...\"\n" +
                            "        }\n" +
                            "      ]\n" +
                            "    }\n" +
                            "  ],\n" +
                            "  \"skillsAnalysis\": [\n" +
                            "    {\n" +
                            "      \"skillName\": \"Skill Name\",\n" +
                            "      \"status\": \"Ready / Intermediate / Need to learn\",\n" +
                            "      \"reason\": \"- Keypoint 1\\n- Keypoint 2\\n- Keypoint 3\"\n" +
                            "    }\n" +
                            "  ],\n" +
                            "  \"roadmap\": [\n" +
                            "    {\n" +
                            "      \"stage\": \"Stage Name (e.g. Month 1-2: Core Backend)\",\n" +
                            "      \"duration\": \"Duration e.g. 2 months\",\n" +
                            "      \"topics\": [\"Topic 1\", \"Topic 2\"],\n" +
                            "      \"resources\": [\"Free resource 1 name\", \"Free resource 2 name\"]\n" +
                            "    }\n" +
                            "  ],\n" +
                            "  \"projects\": [\n" +
                            "    {\n" +
                            "      \"title\": \"Project Title\",\n" +
                            "      \"description\": \"- Keypoint 1\\n- Keypoint 2\\n- Keypoint 3\",\n" +
                            "      \"difficulty\": \"Easy / Medium / Hard\",\n" +
                            "      \"skillsAddressed\": [\"Skill A\", \"Skill B\"]\n" +
                            "    }\n" +
                            "  ],\n" +
                            "  \"certifications\": [\n" +
                            "    {\n" +
                            "      \"name\": \"Certification Name\",\n" +
                            "      \"provider\": \"Provider Name (e.g. AWS, Oracle, Google)\",\n" +
                            "      \"description\": \"- Keypoint 1\\n- Keypoint 2\\n- Keypoint 3\",\n" +
                            "      \"relevance\": \"High / Medium\"\n" +
                            "    }\n" +
                            "  ],\n" +
                            "  \"searchKeywords\": [\"keyword1\", \"keyword2\", \"keyword3\"]\n" +
                            "}",
                    name,
                    department != null ? department : "General",
                    college != null ? college : "University",
                    graduationYear != null ? graduationYear.toString() : "Not specified",
                    skills != null ? skills : "None",
                    interests != null ? interests : "None",
                    careerGoals != null ? careerGoals : "None"
            );

            log.debug("Gemini Outgoing Request URL: {}", logUrl);
            log.debug("Gemini Incoming Prompt: {}", prompt);

            // Construct payload
            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> contentMap = new HashMap<>();
            Map<String, Object> partMap = new HashMap<>();
            partMap.put("text", prompt);
            contentMap.put("parts", Collections.singletonList(partMap));
            requestBody.put("contents", Collections.singletonList(contentMap));

            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", generationConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response;

            try {
                response = restTemplate.postForEntity(url, entity, Map.class);
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                log.error("Gemini API call failed with HTTP Status: {}. Response Body: {}", e.getStatusCode(), e.getResponseBodyAsString(), e);
                throw new RuntimeException("Gemini API error (HTTP " + e.getStatusCode() + "): " + e.getResponseBodyAsString(), e);
            } catch (Exception e) {
                log.error("Gemini API call failed due to connection error", e);
                throw new RuntimeException("Gemini API connection failed: " + e.getMessage(), e);
            }

            log.debug("Gemini Response HTTP Status: {}", response.getStatusCode());
            log.debug("Gemini Response Body: {}", response.getBody());

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List candidates = (List) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map candidate = (Map) candidates.get(0);
                    Map content = (Map) candidate.get("content");
                    if (content != null) {
                        List parts = (List) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map part = (Map) parts.get(0);
                            String textResponse = (String) part.get("text");
                            if (textResponse != null) {
                                return textResponse;
                            }
                        }
                    }
                }
            }
            throw new RuntimeException("Invalid response format returned by Gemini API: " + response.getBody());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error querying Gemini API", e);
            throw new RuntimeException("Unexpected error querying Gemini API: " + e.getMessage(), e);
        }
    }

    private String getApiKey() {
        if (configuredApiKey != null && !configuredApiKey.trim().isEmpty() && !configuredApiKey.contains("${")) {
            return configuredApiKey.trim();
        }
        return System.getenv("GEMINI_API_KEY");
    }
}
