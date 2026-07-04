package com.careeros.controller;

import com.careeros.entity.Blog;
import com.careeros.entity.User;
import com.careeros.repository.BlogRepository;
import com.careeros.repository.UserRepository;
import com.careeros.service.GeminiService;
import com.careeros.dto.response.BlogResponse;
import com.careeros.dto.response.UserResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class CareerGuidanceController {

    private final GeminiService geminiService;
    private final UserRepository userRepository;
    private final BlogRepository blogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/guidance")
    public ResponseEntity<?> getGuidance(@RequestBody GuidanceRequest request, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized access"));
        }

        User currentUser = (User) authentication.getPrincipal();
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // If requested, save changes to profile
        if (request.isSaveToProfile()) {
            boolean updated = false;
            if (request.getSkills() != null) {
                user.setSkills(request.getSkills());
                updated = true;
            }
            if (request.getInterests() != null) {
                user.setInterests(request.getInterests());
                updated = true;
            }
            if (request.getCollege() != null) {
                user.setCollege(request.getCollege());
                updated = true;
            }
            if (request.getDepartment() != null) {
                user.setDepartment(request.getDepartment());
                updated = true;
            }
            if (request.getGraduationYear() != null) {
                user.setGraduationYear(request.getGraduationYear());
                updated = true;
            }
            if (request.getCareerGoals() != null) {
                user.setCareerGoals(request.getCareerGoals());
                updated = true;
            }
            if (updated) {
                userRepository.save(user);
            }
        }

        // Gather final parameters for Gemini analysis
        String name = user.getName();
        String skills = request.getSkills() != null ? request.getSkills() : user.getSkills();
        String interests = request.getInterests() != null ? request.getInterests() : user.getInterests();
        String college = request.getCollege() != null ? request.getCollege() : user.getCollege();
        String department = request.getDepartment() != null ? request.getDepartment() : user.getDepartment();
        Integer graduationYear = request.getGraduationYear() != null ? request.getGraduationYear() : user.getGraduationYear();
        String careerGoals = request.getCareerGoals() != null ? request.getCareerGoals() : user.getCareerGoals();

        // Query Gemini API
        String guidanceJson = geminiService.getCareerGuidance(
                name, college, department, graduationYear, skills, interests, careerGoals
        );

        // Parse JSON response and search database for matching blogs
        Map<String, Object> guidanceMap;
        try {
            guidanceMap = objectMapper.readValue(guidanceJson, Map.class);
        } catch (Exception e) {
            log.error("Failed to parse Gemini response as JSON: {}", guidanceJson, e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Invalid format returned by AI"));
        }

        // Get search keywords and fetch related blogs from platform
        List<String> keywords = new ArrayList<>();
        if (guidanceMap.containsKey("searchKeywords")) {
            try {
                keywords = (List<String>) guidanceMap.get("searchKeywords");
            } catch (Exception e) {
                log.warn("Failed to cast searchKeywords", e);
            }
        }

        // Add default keyword if empty
        if (keywords.isEmpty()) {
            keywords.add("Software");
            keywords.add("Technology");
        }

        Set<Blog> matchingBlogs = new LinkedHashSet<>();
        for (String keyword : keywords) {
            if (keyword != null && !keyword.trim().isEmpty()) {
                Page<Blog> searchPage = blogRepository.search(keyword.trim(), PageRequest.of(0, 3));
                matchingBlogs.addAll(searchPage.getContent());
                if (matchingBlogs.size() >= 5) {
                    break;
                }
            }
        }

        // If not enough matches, try with generic tags or categories
        if (matchingBlogs.size() < 3) {
            Page<Blog> defaultBlogs = blogRepository.findByStatus(Blog.Status.PUBLISHED, PageRequest.of(0, 5));
            matchingBlogs.addAll(defaultBlogs.getContent());
        }

        List<BlogResponse> relevantStories = matchingBlogs.stream()
                .limit(5)
                .map(BlogResponse::fromBlog)
                .collect(Collectors.toList());

        // Construct composite response
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("careerPaths", guidanceMap.get("careerPaths"));
        response.put("skillsAnalysis", guidanceMap.get("skillsAnalysis"));
        response.put("roadmap", guidanceMap.get("roadmap"));
        response.put("projects", guidanceMap.get("projects"));
        response.put("certifications", guidanceMap.get("certifications"));
        response.put("relevantStories", relevantStories);
        response.put("updatedUser", UserResponse.fromUser(user));

        return ResponseEntity.ok(response);
    }

    @Data
    public static class GuidanceRequest {
        private String skills;
        private String interests;
        private String college;
        private String department;
        private Integer graduationYear;
        private String careerGoals;
        private boolean saveToProfile;
    }
}
