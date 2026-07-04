package com.careeros.service;

public interface ChatResponseHandler {
    void onChunk(String chunk) throws Exception;
    void onComplete();
    void onError(Throwable t);
}
