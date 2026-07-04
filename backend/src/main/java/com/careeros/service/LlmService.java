package com.careeros.service;

import com.careeros.entity.MentorChatMessage;

import java.util.List;

public interface LlmService {
    void streamChat(
            String systemInstruction,
            List<MentorChatMessage> history,
            String userMessage,
            String ragContext,
            ChatResponseHandler handler
    );
}
