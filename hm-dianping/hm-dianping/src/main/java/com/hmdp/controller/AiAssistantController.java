package com.hmdp.controller;

import cn.hutool.core.util.StrUtil;
import com.hmdp.ai.dto.AiChatRequest;
import com.hmdp.ai.enums.AiScene;
import com.hmdp.ai.service.AiAssistantService;
import com.hmdp.dto.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiAssistantController {

    private final AiAssistantService aiAssistantService;

    @PostMapping("/customer-service/chat")
    public Result customerService(@RequestBody AiChatRequest request) {
        return Result.ok(aiAssistantService.customerService(request));
    }

    @PostMapping("/query/chat")
    public Result query(@RequestBody AiChatRequest request) {
        return Result.ok(aiAssistantService.query(request));
    }

    @DeleteMapping("/session/{scene}/{sessionId}")
    public Result clearConversation(@PathVariable("scene") String scene, @PathVariable("sessionId") String sessionId) {
        if (StrUtil.isBlank(sessionId)) {
            return Result.fail("sessionId 不能为空");
        }
        aiAssistantService.clearConversation(AiScene.fromCode(scene), sessionId);
        return Result.ok();
    }
}
