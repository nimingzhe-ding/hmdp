package com.hmdp.ai.prompt;

import com.hmdp.ai.enums.AiScene;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.Map;

@Component
public class AiPromptService {

    private final Map<AiScene, String> prompts = new EnumMap<>(AiScene.class);

    @PostConstruct
    public void init() {
        prompts.put(AiScene.CUSTOMER_SERVICE, load("ai/prompts/customer-service-system-prompt.txt"));
        prompts.put(AiScene.QUERY, load("ai/prompts/query-system-prompt.txt"));
    }

    public String getPrompt(AiScene scene) {
        return prompts.get(scene);
    }

    private String load(String path) {
        try {
            return StreamUtils.copyToString(new ClassPathResource(path).getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("加载 AI 提示词失败: " + path, e);
        }
    }
}
