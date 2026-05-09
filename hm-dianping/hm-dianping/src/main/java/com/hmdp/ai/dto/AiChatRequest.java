package com.hmdp.ai.dto;

import lombok.Data;

@Data
public class AiChatRequest {
    private String sessionId;
    private String message;
    private Boolean reset;
}
