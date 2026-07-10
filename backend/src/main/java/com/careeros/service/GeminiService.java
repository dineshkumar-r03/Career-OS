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
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Falling back to mock guidance generator.");
            return generateMockGuidance(name, college, department, graduationYear, skills, interests, careerGoals);
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey;

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
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

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
            log.error("Invalid response from Gemini API: {}", response.getBody());
        } catch (Exception e) {
            log.error("Failed to query Gemini API: {}. Falling back to mock guidance generator.", e.getMessage(), e);
        }

        return generateMockGuidance(name, college, department, graduationYear, skills, interests, careerGoals);
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

    private String generateMockGuidance(
            String name,
            String college,
            String department,
            Integer graduationYear,
            String skills,
            String interests,
            String careerGoals
    ) {
        String lowerSkills = skills != null ? skills.toLowerCase() : "";
        String lowerInterests = interests != null ? interests.toLowerCase() : "";
        String lowerGoals = careerGoals != null ? careerGoals.toLowerCase() : "";

        boolean isAiMl = lowerSkills.contains("python") || lowerSkills.contains("ml") || lowerSkills.contains("ai") ||
                lowerSkills.contains("data science") || lowerInterests.contains("ai") || lowerInterests.contains("ml") ||
                lowerGoals.contains("ai") || lowerGoals.contains("ml");

        boolean isJavaSpring = lowerSkills.contains("java") || lowerSkills.contains("spring") || lowerSkills.contains("hibernate") ||
                lowerInterests.contains("backend") || lowerGoals.contains("backend");

        if (isAiMl) {
            return getAiMlMockJson();
        } else if (isJavaSpring) {
            return getJavaSpringMockJson();
        } else {
            return getFullStackMockJson();
        }
    }

    private String getFullStackMockJson() {
        return "{\n" +
                "  \"careerPaths\": [\n" +
                "    {\n" +
                "      \"title\": \"Full-Stack Software Engineer\",\n" +
                "      \"description\": \"- Leverage your frontend and backend skills to build responsive, complete web applications.\\n- Work on both user interfaces and database logic.\\n- Gain hands-on exposure to full application lifecycles.\",\n" +
                "      \"matchRelevance\": 95,\n" +
                "      \"outlook\": \"Growing / High Demand\",\n" +
                "      \"entryRoles\": [\"Associate Software Engineer\", \"Junior Web Developer\"],\n" +
                "      \"referenceLinks\": [\n" +
                "        { \"title\": \"LinkedIn Jobs: Full Stack\", \"url\": \"https://www.linkedin.com/jobs/search/?keywords=Full%%20Stack%%20Developer\" },\n" +
                "        { \"title\": \"Dev.to: Full Stack Guide\", \"url\": \"https://dev.to/t/webdev\" },\n" +
                "        { \"title\": \"Medium: Web Development\", \"url\": \"https://medium.com/tag/web-development\" }\n" +
                "      ]\n" +
                "    },\n" +
                "    {\n" +
                "      \"title\": \"Frontend Engineer (React Specialist)\",\n" +
                "      \"description\": \"- Focus on creating pixel-perfect, highly responsive, and user-centric client interfaces.\\n- Deeply utilize React, Tailwind CSS, and modern frontend build tools.\\n- Implement responsive state management patterns.\",\n" +
                "      \"matchRelevance\": 85,\n" +
                "      \"outlook\": \"High Demand\",\n" +
                "      \"entryRoles\": [\"Frontend UI Developer\", \"React Developer\"],\n" +
                "      \"referenceLinks\": [\n" +
                "        { \"title\": \"LinkedIn Jobs: React Developer\", \"url\": \"https://www.linkedin.com/jobs/search/?keywords=React%%20Developer\" },\n" +
                "        { \"title\": \"Dev.to: React Tags\", \"url\": \"https://dev.to/t/react\" }\n" +
                "      ]\n" +
                "    },\n" +
                "    {\n" +
                "      \"title\": \"Cloud Web Solutions Architect\",\n" +
                "      \"description\": \"- Design high-availability cloud applications.\\n- Manage deployment pipelines and containerization using Docker and Kubernetes.\\n- Implement serverless backend solutions on cloud providers.\",\n" +
                "      \"matchRelevance\": 78,\n" +
                "      \"outlook\": \"High Demand\",\n" +
                "      \"entryRoles\": [\"Cloud Engineer Graduate\", \"DevOps Engineer Intern\"],\n" +
                "      \"referenceLinks\": [\n" +
                "        { \"title\": \"LinkedIn Jobs: Cloud Solutions\", \"url\": \"https://www.linkedin.com/jobs/search/?keywords=Cloud%%20Solutions%%20Architect\" },\n" +
                "        { \"title\": \"Medium: Cloud Computing\", \"url\": \"https://medium.com/tag/cloud-computing\" }\n" +
                "      ]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"skillsAnalysis\": [\n" +
                "    {\n" +
                "      \"skillName\": \"React & JavaScript\",\n" +
                "      \"status\": \"Ready\",\n" +
                "      \"reason\": \"- Strong base in building interactive component-driven layouts.\\n- Ready to master custom hooks and state management (Redux/Zustand).\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"skillName\": \"Backend & Spring Boot\",\n" +
                "      \"status\": \"Intermediate\",\n" +
                "      \"reason\": \"- Good understanding of controllers and REST endpoints.\\n- Should dive deeper into JPA relationships, transactions, and Spring Security.\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"skillName\": \"Docker & DevOps CI/CD\",\n" +
                "      \"status\": \"Need to learn\",\n" +
                "      \"reason\": \"- Modern full stack roles expect you to package applications.\\n- Learn to deploy them to cloud providers (AWS/GCP) using Github Actions.\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"roadmap\": [\n" +
                "    {\n" +
                "      \"stage\": \"Stage 1: Enterprise Backend Mastery\",\n" +
                "      \"duration\": \"1 Month\",\n" +
                "      \"topics\": [\"Spring Boot Security & JWT Tokens\", \"Database indexing and pagination\", \"Writing integration tests with JUnit/Mockito\"],\n" +
                "      \"resources\": [\"Spring Boot Guide - Baeldung\", \"Spring Security Course - Java Brains (YouTube)\"]\n" +
                "    },\n" +
                "    {\n" +
                "      \"stage\": \"Stage 2: Advanced Frontend & Optimization\",\n" +
                "      \"duration\": \"1 Month\",\n" +
                "      \"topics\": [\"State management (Zustand/Redux Toolkit)\", \"React performance (useMemo, useCallback)\", \"Websockets for real-time collaboration\"],\n" +
                "      \"resources\": [\"React documentation (react.dev)\", \"Kent C. Dodds - Epic React blog\"]\n" +
                "    },\n" +
                "    {\n" +
                "      \"stage\": \"Stage 3: Cloud & Containerization\",\n" +
                "      \"duration\": \"1 Month\",\n" +
                "      \"topics\": [\"Dockerizing React and Spring Boot Apps\", \"AWS EC2 and RDS instances\", \"GitHub Actions CI/CD workflows\"],\n" +
                "      \"resources\": [\"Docker Official Getting Started Guide\", \"AWS Academy Certified Cloud Practitioner\"]\n" +
                "    },\n" +
                "    {\n" +
                "      \"stage\": \"Stage 4: Portfolio & System Design\",\n" +
                "      \"duration\": \"3 Weeks\",\n" +
                "      \"topics\": [\"System Design basics (Load balancers, Caching, Scaling)\", \"Deploying a large capstone project\", \"Polishing resume & Github\"],\n" +
                "      \"resources\": [\"ByteByteGo System Design primer\", \"Roadmap.sh - Full Stack Developer Roadmap\"]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"projects\": [\n" +
                "    {\n" +
                "      \"title\": \"Collaborative Real-time Board (Trello-like)\",\n" +
                "      \"description\": \"- Build a project management board supporting real-time drag-and-drop workspace updates.\\n- Implement WebSockets, JWT authentication, and Spring JPA PostgreSQL audits.\",\n" +
                "      \"difficulty\": \"Hard\",\n" +
                "      \"skillsAddressed\": [\"React\", \"Spring Boot Websockets\", \"PostgreSQL\", \"Tailwind CSS\"]\n" +
                "    },\n" +
                "    {\n" +
                "      \"title\": \"Mock Payment Gateway Integration Suite\",\n" +
                "      \"description\": \"- Create a sandbox platform that allows developers to simulate payment operations.\\n- Record webhook events, and visualize request logs with interactive charts.\",\n" +
                "      \"difficulty\": \"Medium\",\n" +
                "      \"skillsAddressed\": [\"Java\", \"Chart.js\", \"Spring Security\", \"Bootstrap\"]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"certifications\": [\n" +
                "    {\n" +
                "      \"name\": \"AWS Certified Developer - Associate\",\n" +
                "      \"provider\": \"Amazon Web Services\",\n" +
                "      \"description\": \"- Validates proficiency in developing, deploying, and debugging cloud-based applications.\\n- Highly valued for modern full-stack deployment setups.\",\n" +
                "      \"relevance\": \"High\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"name\": \"Oracle Certified Professional: Java SE Developer\",\n" +
                "      \"provider\": \"Oracle\",\n" +
                "      \"description\": \"- Demonstrates deep backend proficiency in Java core logic.\\n- Confirms solid knowledge of object-oriented architectures.\",\n" +
                "      \"relevance\": \"Medium\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"searchKeywords\": [\"React\", \"Java\", \"Spring Boot\", \"Web Development\", \"Backend\"]\n" +
                "}";
    }

    private String getJavaSpringMockJson() {
        return "{\n" +
                "  \"careerPaths\": [\n" +
                "    {\n" +
                "      \"title\": \"Backend Engineer (Java Enterprise)\",\n" +
                "      \"description\": \"- Design and build microservices architectures and transactional APIs.\\n- Build robust data integration channels inside high-scale corporate environments.\",\n" +
                "      \"matchRelevance\": 98,\n" +
                "      \"outlook\": \"Stable / High Demand\",\n" +
                "      \"entryRoles\": [\"Junior Backend Developer\", \"Java Systems Analyst\"],\n" +
                "      \"referenceLinks\": [\n" +
                "        { \"title\": \"LinkedIn Jobs: Java Developer\", \"url\": \"https://www.linkedin.com/jobs/search/?keywords=Java%%20Backend%%20Engineer\" },\n" +
                "        { \"title\": \"Baeldung Spring Boot\", \"url\": \"https://www.baeldung.com/\" },\n" +
                "        { \"title\": \"Dev.to: Java Articles\", \"url\": \"https://dev.to/t/java\" }\n" +
                "      ]\n" +
                "    },\n" +
                "    {\n" +
                "      \"title\": \"Database & Reliability Engineer\",\n" +
                "      \"description\": \"- Optimize SQL execution plans and database structures.\\n- Manage data replication pipelines and database caching patterns.\",\n" +
                "      \"matchRelevance\": 80,\n" +
                "      \"outlook\": \"Growing\",\n" +
                "      \"entryRoles\": [\"Associate Database Engineer\", \"DBA Assistant\"],\n" +
                "      \"referenceLinks\": [\n" +
                "        { \"title\": \"LinkedIn Jobs: Database Developer\", \"url\": \"https://www.linkedin.com/jobs/search/?keywords=Database%%20Engineer\" },\n" +
                "        { \"title\": \"Medium: Database Optimization\", \"url\": \"https://medium.com/tag/database\" }\n" +
                "      ]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"skillsAnalysis\": [\n" +
                "    {\n" +
                "      \"skillName\": \"Java Core & OOP\",\n" +
                "      \"status\": \"Ready\",\n" +
                "      \"reason\": \"- Solid understanding of Java collections, threads, and syntax.\\n- Make sure you also master Java 17 features like records and pattern matching.\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"skillName\": \"Spring JPA & Hibernate\",\n" +
                "      \"status\": \"Intermediate\",\n" +
                "      \"reason\": \"- Can perform basic CRUD operations.\\n- Need to learn database optimization, N+1 query problem avoidance, and custom native queries.\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"skillName\": \"Microservices & Spring Cloud\",\n" +
                "      \"status\": \"Need to learn\",\n" +
                "      \"reason\": \"- Distributed enterprise system environments demand this.\\n- Learn Eureka Discovery, Gateway, and Circuit Breakers (Resilience4j).\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"roadmap\": [\n" +
                "    {\n" +
                "      \"stage\": \"Stage 1: Advanced SQL & JPA Optimization\",\n" +
                "      \"duration\": \"1 Month\",\n" +
                "      \"topics\": [\"Indexing in MySQL\", \"Hibernate L2 Cache\", \"DTO projections with JPA\", \"Avoiding N+1 problems\"],\n" +
                "      \"resources\": [\"Vlad Mihalcea's High-Performance Java Persistence blog\", \"SQLZoo advanced exercises\"]\n" +
                "    },\n" +
                "    {\n" +
                "      \"stage\": \"Stage 2: Microservices & Spring Cloud\",\n" +
                "      \"duration\": \"1 Month\",\n" +
                "      \"topics\": [\"Spring Cloud Gateway\", \"Eureka Registry\", \"Eureka client communication via FeignClient\", \"Kafka event-driven queues\"],\n" +
                "      \"resources\": [\"Spring Cloud documentation\", \"Kafka Definitive Guide - O'Reilly\"]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"projects\": [\n" +
                "    {\n" +
                "      \"title\": \"Distributed E-Commerce Backend Suite\",\n" +
                "      \"description\": \"- Write a set of microservices (Order, Inventory, Product) communicating via FeignClient and Kafka.\\n- Manage distributed transactions and circuit breakers with Resilience4j.\",\n" +
                "      \"difficulty\": \"Hard\",\n" +
                "      \"skillsAddressed\": [\"Spring Boot\", \"Spring Cloud\", \"Kafka\", \"PostgreSQL\", \"Redis\"]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"certifications\": [\n" +
                "    {\n" +
                "      \"name\": \"Spring Certified Professional\",\n" +
                "      \"provider\": \"VMware\",\n" +
                "      \"description\": \"- Validates understanding of core Spring concepts, IoC container, Spring Boot, JPA, and transactions.\\n- Essential credential for corporate enterprise backend roles.\",\n" +
                "      \"relevance\": \"High\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"searchKeywords\": [\"Java\", \"Spring Boot\", \"Backend\", \"SQL\", \"LikeService\"]\n" +
                "}";
    }

    private String getAiMlMockJson() {
        return "{\n" +
                "  \"careerPaths\": [\n" +
                "    {\n" +
                "      \"title\": \"AI / Machine Learning Engineer\",\n" +
                "      \"description\": \"- Design ML models and build inference pipelines.\\n- Integrate Large Language Models (LLMs) and scale machine learning workloads in production.\",\n" +
                "      \"matchRelevance\": 96,\n" +
                "      \"outlook\": \"Growing / High Demand\",\n" +
                "      \"entryRoles\": [\"Junior ML Engineer\", \"AI Research Intern\"],\n" +
                "      \"referenceLinks\": [\n" +
                "        { \"title\": \"LinkedIn Jobs: ML Engineer\", \"url\": \"https://www.linkedin.com/jobs/search/?keywords=Machine%%20Learning%%20Engineer\" },\n" +
                "        { \"title\": \"Dev.to: Machine Learning\", \"url\": \"https://dev.to/t/machinelearning\" }\n" +
                "      ]\n" +
                "    },\n" +
                "    {\n" +
                "      \"title\": \"Data Scientist / Analyst\",\n" +
                "      \"description\": \"- Perform exploratory analysis and build statistical models.\\n- Write data processing scripts and build interactive analytics dashboards.\",\n" +
                "      \"matchRelevance\": 85,\n" +
                "      \"outlook\": \"High Demand\",\n" +
                "      \"entryRoles\": [\"Junior Data Analyst\", \"Associate Data Scientist\"],\n" +
                "      \"referenceLinks\": [\n" +
                "        { \"title\": \"LinkedIn Jobs: Data Scientist\", \"url\": \"https://www.linkedin.com/jobs/search/?keywords=Data%%20Scientist\" },\n" +
                "        { \"title\": \"Medium: Data Science\", \"url\": \"https://medium.com/tag/data-science\" }\n" +
                "      ]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"skillsAnalysis\": [\n" +
                "    {\n" +
                "      \"skillName\": \"Python Core & NumPy\",\n" +
                "      \"status\": \"Ready\",\n" +
                "      \"reason\": \"- Great script drafting skills.\\n- Make sure you transition to Pandas dataframes and structured object-oriented code in Python.\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"skillName\": \"TensorFlow or PyTorch\",\n" +
                "      \"status\": \"Intermediate\",\n" +
                "      \"reason\": \"- Can construct simple feedforward networks.\\n- Need to learn CNNs, RNNs, and custom training loops in deep learning models.\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"skillName\": \"MLOps & Model Deployment\",\n" +
                "      \"status\": \"Need to learn\",\n" +
                "      \"reason\": \"- Models must be deployed to be useful.\\n- Learn FastAPI wrappers, Docker containerizing model pipelines, and cloud endpoints (AWS SageMaker).\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"roadmap\": [\n" +
                "    {\n" +
                "      \"stage\": \"Stage 1: Advanced ML Algorithms\",\n" +
                "      \"duration\": \"1 Month\",\n" +
                "      \"topics\": [\"Deep learning neural architectures\", \"PyTorch tensors and models\", \"Transfer learning with HuggingFace transformers\"],\n" +
                "      \"resources\": [\"Deep Learning Specialization - Andrew Ng (Coursera)\", \"PyTorch Official Tutorials\"]\n" +
                "    },\n" +
                "    {\n" +
                "      \"stage\": \"Stage 2: MLOps and APIs\",\n" +
                "      \"duration\": \"1 Month\",\n" +
                "      \"topics\": [\"FastAPI server development\", \"Dockerizing model services\", \"MLflow experiment tracking\"],\n" +
                "      \"resources\": [\"FastAPI docs\", \"MLOps Zoomcamp - DataTalksClub\"]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"projects\": [\n" +
                "    {\n" +
                "      \"title\": \"Multimodal Search Engine for Images & Text\",\n" +
                "      \"description\": \"- Create a search database that matches text queries to image directories using CLIP embeddings.\\n- Use a Vector Database (Qdrant or Pinecone) and set up a FastAPI backend wrapper.\",\n" +
                "      \"difficulty\": \"Hard\",\n" +
                "      \"skillsAddressed\": [\"PyTorch\", \"FastAPI\", \"Qdrant Vector DB\", \"Docker\"]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"certifications\": [\n" +
                "    {\n" +
                "      \"name\": \"Google Cloud Professional Machine Learning Engineer\",\n" +
                "      \"provider\": \"Google Cloud\",\n" +
                "      \"description\": \"- Validates design, construction, and deployment of ML pipelines.\\n- Highly recognized certification for enterprise MLOps roles.\",\n" +
                "      \"relevance\": \"High\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"searchKeywords\": [\"Python\", \"AI\", \"Gemini\", \"Data Science\", \"Blog\"]\n" +
                "}";
    }
}
