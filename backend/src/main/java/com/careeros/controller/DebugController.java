package com.careeros.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @Value("${gemini.api.key:}")
    private String configuredApiKey;

    @GetMapping("/gemini")
    public ResponseEntity<?> debugGemini() {
        Map<String, Object> debugInfo = new HashMap<>();

        String apiKey = getApiKey();
        boolean isKeyLoaded = apiKey != null && !apiKey.trim().isEmpty();
        int keyLength = isKeyLoaded ? apiKey.trim().length() : 0;
        boolean hasPlaceholder = isKeyLoaded && apiKey.contains("${");

        debugInfo.put("isApiKeyLoaded", isKeyLoaded);
        debugInfo.put("keyLength", keyLength);
        debugInfo.put("hasPlaceholderSyntax", hasPlaceholder);
        debugInfo.put("modelName", "gemini-1.5-flash");
        debugInfo.put("endpointUrl", "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash");

        int googleResponseCode = -1;
        String latestException = "None";
        try {
            // Check Google Generative Language domain connectivity
            URL url = new URL("https://generativelanguage.googleapis.com");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            googleResponseCode = conn.getResponseCode();
        } catch (Exception e) {
            latestException = e.getClass().getName() + ": " + e.getMessage();
        }

        debugInfo.put("canGoogleBeReached", googleResponseCode != -1);
        debugInfo.put("latestGoogleResponseCode", googleResponseCode);
        debugInfo.put("latestException", latestException);

        return ResponseEntity.ok(debugInfo);
    }

    private String getApiKey() {
        if (configuredApiKey != null && !configuredApiKey.trim().isEmpty() && !configuredApiKey.contains("${")) {
            return configuredApiKey.trim();
        }
        return System.getenv("GEMINI_API_KEY");
    }
}
