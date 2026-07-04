package com.careeros.controller;

import com.careeros.entity.MentorChatMessage;
import com.careeros.entity.MentorChatSession;
import com.careeros.entity.User;
import com.careeros.service.MentorService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mentor")
@RequiredArgsConstructor
@Slf4j
public class MentorController {

    private final MentorService mentorService;

    @GetMapping("/sessions")
    public ResponseEntity<?> getSessions(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized access"));
        }
        User currentUser = (User) authentication.getPrincipal();
        List<MentorChatSession> sessions = mentorService.getSessions(currentUser);
        return ResponseEntity.ok(sessions);
    }

    @PostMapping("/sessions")
    public ResponseEntity<?> createSession(@RequestBody CreateSessionRequest request, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized access"));
        }
        User currentUser = (User) authentication.getPrincipal();
        MentorChatSession session = mentorService.createSession(currentUser, request.getTitle());
        return ResponseEntity.ok(session);
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<?> deleteSession(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized access"));
        }
        User currentUser = (User) authentication.getPrincipal();
        try {
            mentorService.deleteSession(id, currentUser);
            return ResponseEntity.ok(Map.of("message", "Session deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/sessions/{id}/messages")
    public ResponseEntity<?> getMessages(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized access"));
        }
        User currentUser = (User) authentication.getPrincipal();
        try {
            List<MentorChatMessage> messages = mentorService.getMessages(id, currentUser);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping(value = "/sessions/{sessionId}/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChatReply(
            @PathVariable Long sessionId,
            @RequestParam String prompt,
            Authentication authentication) {
        
        SseEmitter emitter = new SseEmitter(180000L); // 3 minutes timeout for long responses
        
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            try {
                emitter.send(SseEmitter.event().name("error").data("Unauthorized access"));
                emitter.complete();
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        User currentUser = (User) authentication.getPrincipal();
        try {
            mentorService.streamChatReply(sessionId, prompt, currentUser, emitter);
        } catch (Exception e) {
            log.error("Failed to run streaming chat controller", e);
            try {
                emitter.send(SseEmitter.event().name("error").data("Internal error: " + e.getMessage()));
                emitter.complete();
            } catch (IOException ie) {
                emitter.completeWithError(ie);
            }
        }

        return emitter;
    }

    @Data
    public static class CreateSessionRequest {
        private String title;
    }
}
