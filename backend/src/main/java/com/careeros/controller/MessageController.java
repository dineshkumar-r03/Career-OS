package com.careeros.controller;

import com.careeros.dto.request.MessageRequest;
import com.careeros.dto.response.ConversationResponse;
import com.careeros.dto.response.MessageResponse;
import com.careeros.entity.User;
import com.careeros.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<MessageResponse> sendMessage(
            @Valid @RequestBody MessageRequest request,
            Authentication authentication) {
        User sender = (User) authentication.getPrincipal();
        return ResponseEntity.ok(messageService.sendMessage(request, sender));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationResponse>> getConversations(
            Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(messageService.getConversations(currentUser));
    }

    @GetMapping("/chat/{recipientId}")
    public ResponseEntity<List<MessageResponse>> getChatHistory(
            @PathVariable Long recipientId,
            Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(messageService.getChatHistory(recipientId, currentUser));
    }

    @PostMapping("/{messageId}/like")
    public ResponseEntity<MessageResponse> toggleLikeMessage(
            @PathVariable Long messageId,
            Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(messageService.toggleLikeMessage(messageId, currentUser));
    }
}
