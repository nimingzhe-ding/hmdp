package com.hmdp.controller;

import cn.hutool.core.util.StrUtil;
import com.hmdp.ai.dto.AiChatRequest;
import com.hmdp.ai.dto.AiChatResponse;
import com.hmdp.ai.enums.AiScene;
import com.hmdp.ai.service.AiAssistantService;
import com.hmdp.dto.AiFlowRequest;
import com.hmdp.dto.Result;
import com.hmdp.entity.Blog;
import com.hmdp.entity.MallOrder;
import com.hmdp.entity.MallProduct;
import com.hmdp.service.IBlogService;
import com.hmdp.service.IMallOrderService;
import com.hmdp.service.IMallProductService;
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
    private final IBlogService blogService;
    private final IMallProductService productService;
    private final IMallOrderService orderService;

    @PostMapping("/customer-service/chat")
    public Result customerService(@RequestBody AiChatRequest request) {
        return Result.ok(aiAssistantService.customerService(request));
    }

    @PostMapping("/query/chat")
    public Result query(@RequestBody AiChatRequest request) {
        return Result.ok(aiAssistantService.query(request));
    }

    @PostMapping("/flow/search")
    public Result flowSearch(@RequestBody AiFlowRequest request) {
        return safeFlow("AI 搜索", request, """
                用户搜索：%s
                请理解用户真实意图，说明应该优先看哪些笔记、商品、商家和话题，并给出一句搜索结果摘要。
                """.formatted(text(request.getQuery())));
    }

    @PostMapping("/flow/shopping-guide")
    public Result shoppingGuide(@RequestBody AiFlowRequest request) {
        MallProduct product = request == null || request.getProductId() == null ? null : productService.getById(request.getProductId());
        return safeFlow("AI 导购", request, """
                用户问题：%s
                商品信息：%s
                请判断是否适合当前问题里的送礼/自用/场景需求，给出适合点、顾虑点和购买建议。
                """.formatted(text(request == null ? null : request.getQuery()), productText(product)));
    }

    @PostMapping("/flow/note-summary")
    public Result noteSummary(@RequestBody AiFlowRequest request) {
        Blog blog = request == null || request.getNoteId() == null ? null : blogService.getById(request.getNoteId());
        String title = text(request == null ? null : request.getTitle());
        String content = text(request == null ? null : request.getContent());
        if (blog != null) {
            title = StrUtil.blankToDefault(blog.getTitle(), title);
            content = StrUtil.blankToDefault(blog.getContent(), content);
        }
        return safeFlow("AI 笔记总结", request, """
                笔记标题：%s
                笔记正文：%s
                请自动总结亮点、避雷点、价格信息、适合人群，每项一句话。
                """.formatted(title, content));
    }

    @PostMapping("/flow/compose")
    public Result compose(@RequestBody AiFlowRequest request) {
        return safeFlow("AI 创作助手", request, """
                发布类型：%s
                已有标题：%s
                已有正文：%s
                请生成一个更适合内容种草平台的标题、5个标签和一段可直接使用的正文。
                """.formatted(text(request == null ? null : request.getScenario()), text(request == null ? null : request.getTitle()), text(request == null ? null : request.getContent())));
    }

    @PostMapping("/flow/comment")
    public Result comment(@RequestBody AiFlowRequest request) {
        return safeFlow("AI 评论助手", request, """
                当前内容：%s
                评论/回复目标：%s
                请生成3条自然、不夸张、不冒犯的评论或回复，控制在30字以内。
                """.formatted(text(request == null ? null : request.getContent()), text(request == null ? null : request.getQuery())));
    }

    @PostMapping("/flow/merchant-copy")
    public Result merchantCopy(@RequestBody AiFlowRequest request) {
        return safeFlow("AI 商家助手", request, """
                商品/活动信息：%s
                请生成商品标题、3条卖点和一条优惠券文案，语气真实克制，不要虚假承诺。
                """.formatted(text(request == null ? null : request.getContent())));
    }

    @PostMapping("/flow/customer-service")
    public Result customerServiceFlow(@RequestBody AiFlowRequest request) {
        MallOrder order = request == null || request.getOrderId() == null ? null : orderService.getById(request.getOrderId());
        MallProduct product = request == null || request.getProductId() == null ? null : productService.getById(request.getProductId());
        return safeFlow("AI 客服", request, """
                用户咨询：%s
                订单信息：%s
                商品信息：%s
                请按客服口吻回答，涉及退款、物流、库存时说明当前系统状态和下一步操作。
                """.formatted(text(request == null ? null : request.getQuery()), orderText(order), productText(product)));
    }

    @PostMapping("/flow/recommend-reason")
    public Result recommendReason(@RequestBody AiFlowRequest request) {
        Blog blog = request == null || request.getNoteId() == null ? null : blogService.getById(request.getNoteId());
        return safeFlow("AI 推荐解释", request, """
                推荐内容：%s
                用户当前意图：%s
                请用一句话解释为什么推荐这条内容，避免暴露隐私和复杂算法。
                """.formatted(blogText(blog), text(request == null ? null : request.getQuery())));
    }

    @PostMapping("/flow/risk-check")
    public Result riskCheck(@RequestBody AiFlowRequest request) {
        String content = text(request == null ? null : request.getContent());
        String fallback = ruleRiskResult(content);
        return safeFlow("AI 风控", request, """
                待审核内容：%s
                请识别低质内容、广告、辱骂、刷评风险，输出：风险等级、原因、建议动作。
                """.formatted(content), fallback);
    }

    @DeleteMapping("/session/{scene}/{sessionId}")
    public Result clearConversation(@PathVariable("scene") String scene, @PathVariable("sessionId") String sessionId) {
        if (StrUtil.isBlank(sessionId)) {
            return Result.fail("sessionId 不能为空");
        }
        aiAssistantService.clearConversation(AiScene.fromCode(scene), sessionId);
        return Result.ok();
    }

    private Result safeFlow(String sceneName, AiFlowRequest request, String message) {
        return safeFlow(sceneName, request, message, sceneName + "暂时不可用，先按页面已有信息继续操作。");
    }

    private Result safeFlow(String sceneName, AiFlowRequest request, String message, String fallback) {
        AiChatRequest chatRequest = new AiChatRequest();
        chatRequest.setSessionId(StrUtil.blankToDefault(request == null ? null : request.getSessionId(), sceneName));
        chatRequest.setReset(request == null ? null : request.getReset());
        chatRequest.setMessage(message);
        try {
            AiChatResponse response = aiAssistantService.flow(chatRequest);
            return Result.ok(response);
        } catch (RuntimeException e) {
            return Result.ok(new AiChatResponse(AiScene.FLOW.getCode(), chatRequest.getSessionId(),
                    fallback, java.util.List.of(), null, java.time.LocalDateTime.now()));
        }
    }

    private String ruleRiskResult(String content) {
        String lower = content == null ? "" : content.toLowerCase();
        if (StrUtil.isBlank(lower) || lower.length() < 8) {
            return "风险等级：中。原因：内容过短，可能是低质内容。建议动作：提示用户补充真实体验。";
        }
        if (lower.contains("加微信") || lower.contains("返现") || lower.contains("刷单") || lower.contains("兼职")) {
            return "风险等级：高。原因：疑似广告或刷评引流。建议动作：拦截发布并提示修改。";
        }
        if (lower.contains("垃圾") || lower.contains("傻") || lower.contains("滚")) {
            return "风险等级：高。原因：疑似辱骂攻击。建议动作：拦截或进入人工审核。";
        }
        return "风险等级：低。原因：未命中明显广告、辱骂、刷评特征。建议动作：允许继续。";
    }

    private String text(String value) {
        return StrUtil.blankToDefault(StrUtil.trim(value), "未提供");
    }

    private String blogText(Blog blog) {
        if (blog == null) return "未提供";
        return "标题：" + blog.getTitle() + "；正文：" + blog.getContent() + "；点赞：" + blog.getLiked() + "；评论：" + blog.getComments();
    }

    private String productText(MallProduct product) {
        if (product == null) return "未提供";
        return "标题：" + product.getTitle() + "；副标题：" + product.getSubTitle() + "；价格：" + product.getPrice()
                + "；库存：" + product.getStock() + "；销量：" + product.getSold();
    }

    private String orderText(MallOrder order) {
        if (order == null) return "未提供";
        return "订单号：" + order.getId() + "；商品：" + order.getProductTitle() + "；状态：" + order.getStatus()
                + "；物流：" + order.getLogisticsCompany() + "/" + order.getLogisticsNo();
    }
}
