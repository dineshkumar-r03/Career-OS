package com.careeros.dto.response;

import com.careeros.entity.Message;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageResponse {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderProfilePicture;
    private Long recipientId;
    private String recipientName;
    private String recipientProfilePicture;
    private String content;
    private LocalDateTime createdAt;
    private boolean isRead;
    private boolean isLiked;

    public static MessageResponse fromMessage(Message message) {
        MessageResponse response = new MessageResponse();
        response.setId(message.getId());
        response.setSenderId(message.getSender().getId());
        response.setSenderName(message.getSender().getName());
        response.setSenderProfilePicture(message.getSender().getProfilePicture());
        response.setRecipientId(message.getRecipient().getId());
        response.setRecipientName(message.getRecipient().getName());
        response.setRecipientProfilePicture(message.getRecipient().getProfilePicture());
        response.setContent(message.getContent());
        response.setCreatedAt(message.getCreatedAt());
        response.setRead(message.isRead());
        response.setLiked(message.isLiked());
        return response;
    }
}
