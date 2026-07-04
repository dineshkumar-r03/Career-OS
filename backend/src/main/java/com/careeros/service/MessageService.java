package com.careeros.service;

import com.careeros.dto.request.MessageRequest;
import com.careeros.dto.response.ConversationResponse;
import com.careeros.dto.response.MessageResponse;
import com.careeros.dto.response.UserResponse;
import com.careeros.entity.Message;
import com.careeros.entity.NotificationType;
import com.careeros.entity.User;
import com.careeros.repository.MessageRepository;
import com.careeros.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public MessageResponse sendMessage(MessageRequest request, User sender) {
        User recipient = userRepository.findById(request.getRecipientId())
            .orElseThrow(() -> new RuntimeException("Recipient not found"));

        if (sender.getId().equals(recipient.getId())) {
            throw new RuntimeException("You cannot send a message to yourself");
        }

        Message message = new Message();
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(request.getContent());

        messageRepository.save(message);
        notificationService.createNotification(recipient, sender, NotificationType.MESSAGE, null);
        return MessageResponse.fromMessage(message);
    }

    @Transactional
    public List<MessageResponse> getChatHistory(Long recipientId, User currentUser) {
        User recipient = userRepository.findById(recipientId)
            .orElseThrow(() -> new RuntimeException("Recipient not found"));

        List<Message> history = messageRepository.findChatHistory(currentUser.getId(), recipientId);

        // Mark unread messages received by currentUser as read
        List<Message> unreadReceived = history.stream()
            .filter(m -> m.getRecipient().getId().equals(currentUser.getId()) && !m.isRead())
            .peek(m -> m.setRead(true))
            .collect(Collectors.toList());

        if (!unreadReceived.isEmpty()) {
            messageRepository.saveAll(unreadReceived);
        }
        notificationService.markMessageNotificationsAsRead(currentUser, recipient);

        return history.stream()
            .map(MessageResponse::fromMessage)
            .collect(Collectors.toList());
    }

    public List<ConversationResponse> getConversations(User currentUser) {
        List<User> senders = messageRepository.findSendersByRecipientId(currentUser.getId());
        List<User> recipients = messageRepository.findRecipientsBySenderId(currentUser.getId());

        Map<Long, User> uniqueUsersMap = new HashMap<>();
        for (User u : senders) {
            if (!u.getId().equals(currentUser.getId())) {
                uniqueUsersMap.put(u.getId(), u);
            }
        }
        for (User u : recipients) {
            if (!u.getId().equals(currentUser.getId())) {
                uniqueUsersMap.put(u.getId(), u);
            }
        }

        List<ConversationResponse> conversations = new ArrayList<>();

        for (User otherUser : uniqueUsersMap.values()) {
            ConversationResponse conv = new ConversationResponse();
            
            // Map UserResponse details
            UserResponse userResponse = UserResponse.fromUser(otherUser);
            conv.setUser(userResponse);

            // Fetch last message details
            List<Message> lastMsgs = messageRepository.findLastMessage(currentUser.getId(), otherUser.getId(), PageRequest.of(0, 1));
            if (!lastMsgs.isEmpty()) {
                Message last = lastMsgs.get(0);
                conv.setLastMessage(last.getContent());
                conv.setLastMessageTime(last.getCreatedAt());
            }

            // Unread count (messages sent by otherUser to currentUser that are not read)
            long unread = messageRepository.countBySenderAndRecipientAndIsReadFalse(otherUser, currentUser);
            conv.setUnreadCount(unread);

            conversations.add(conv);
        }

        // Sort conversations by last message time descending
        conversations.sort((c1, c2) -> {
            if (c1.getLastMessageTime() == null && c2.getLastMessageTime() == null) return 0;
            if (c1.getLastMessageTime() == null) return 1;
            if (c2.getLastMessageTime() == null) return -1;
            return c2.getLastMessageTime().compareTo(c1.getLastMessageTime());
        });

        return conversations;
    }

    @Transactional
    public MessageResponse toggleLikeMessage(Long messageId, User currentUser) {
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));

        // Only sender or recipient of the message can like it
        if (!message.getSender().getId().equals(currentUser.getId()) &&
            !message.getRecipient().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized to like this message");
        }

        message.setLiked(!message.isLiked());
        messageRepository.save(message);
        return MessageResponse.fromMessage(message);
    }
}
