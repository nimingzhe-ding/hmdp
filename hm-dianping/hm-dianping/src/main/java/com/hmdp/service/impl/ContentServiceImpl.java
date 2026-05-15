package com.hmdp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hmdp.ai.dto.AiChatRequest;
import com.hmdp.ai.service.AiAssistantService;
import com.hmdp.dto.ContentAiRequest;
import com.hmdp.dto.ContentFeedResult;
import com.hmdp.dto.ContentNoteDTO;
import com.hmdp.dto.ContentProfileDTO;
import com.hmdp.dto.ContentShopDTO;
import com.hmdp.dto.ContentTrendDTO;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.Blog;
import com.hmdp.entity.BlogCollect;
import com.hmdp.entity.BlogProduct;
import com.hmdp.entity.MallProduct;
import com.hmdp.entity.NoteEvent;
import com.hmdp.entity.Shop;
import com.hmdp.entity.User;
import com.hmdp.entity.Voucher;
import com.hmdp.mapper.BlogProductMapper;
import com.hmdp.mapper.NoteEventMapper;
import com.hmdp.service.IBlogCollectService;
import com.hmdp.service.IBlogService;
import com.hmdp.service.IContentService;
import com.hmdp.service.IFollowService;
import com.hmdp.service.IMallProductService;
import com.hmdp.service.IShopService;
import com.hmdp.service.IUserService;
import com.hmdp.service.IVoucherService;
import com.hmdp.utils.SystemConstants;
import com.hmdp.utils.UserHolder;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 内容社区聚合服务实现。
 * 这里把旧的探店 Blog 模型包装成图文社区需要的 Feed、详情、主页、收藏和趋势接口，
 * 前端只需要面向 /content 系列接口，不再散落调用多个旧业务接口。
 */
@Service
public class ContentServiceImpl implements IContentService {

    @Resource
    private IBlogService blogService;

    @Resource
    private IUserService userService;

    @Resource
    private IShopService shopService;

    @Resource
    private IVoucherService voucherService;

    @Resource
    private IFollowService followService;

    @Resource
    private IBlogCollectService blogCollectService;

    @Resource
    private IMallProductService mallProductService;

    @Resource
    private BlogProductMapper blogProductMapper;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Resource
    private NoteEventMapper noteEventMapper;

    @Resource
    private AiAssistantService aiAssistantService;

    @Override
    public Result feed(String channel, String query, Integer current) {
        int pageNo = normalizePage(current);
        Page<Blog> page = buildFeedQuery(channel, query, pageNo);
        return Result.ok(toFeedResult(page, query));
    }

    @Override
    public Result detail(Long blogId) {
        if (blogId == null) {
            return Result.fail("笔记ID不能为空");
        }
        Blog blog = blogService.getById(blogId);
        if (blog == null) {
            return Result.fail("笔记不存在");
        }
        return Result.ok(toNoteDTO(blog));
    }

    @Override
    public Result mine(Integer current) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        return userNotes(user.getId(), current);
    }

    @Override
    public Result collections(Integer current) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        int pageNo = normalizePage(current);
        Page<BlogCollect> collectPage = blogCollectService.query()
                .eq("user_id", user.getId())
                .orderByDesc("create_time")
                .page(new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE));
        List<Long> blogIds = collectPage.getRecords().stream()
                .map(BlogCollect::getBlogId)
                .toList();
        List<ContentNoteDTO> notes = findNotesByIds(blogIds);
        boolean hasMore = collectPage.getCurrent() < collectPage.getPages();
        return Result.ok(new ContentFeedResult(notes, collectPage.getTotal(), hasMore, null));
    }

    @Override
    public Result userNotes(Long userId, Integer current) {
        if (userId == null) {
            return Result.fail("用户ID不能为空");
        }
        int pageNo = normalizePage(current);
        Page<Blog> page = blogService.query()
                .eq("user_id", userId)
                .orderByDesc("create_time")
                .page(new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE));
        return Result.ok(toFeedResult(page, null));
    }

    @Override
    public Result profile(Long userId) {
        UserDTO currentUser = UserHolder.getUser();
        Long targetUserId = userId;
        if (targetUserId == null && currentUser != null) {
            targetUserId = currentUser.getId();
        }
        if (targetUserId == null) {
            return Result.fail("请先登录");
        }
        User user = userService.getById(targetUserId);
        if (user == null) {
            return Result.fail("用户不存在");
        }
        ContentProfileDTO profile = new ContentProfileDTO();
        profile.setUserId(user.getId());
        profile.setNickName(user.getNickName());
        profile.setIcon(user.getIcon());
        profile.setNotes(blogService.query().eq("user_id", user.getId()).count());
        profile.setLikes(sumUserLikes(user.getId()));
        profile.setCollects(countUserReceivedCollects(user.getId()));
        profile.setFollowers(followService.query().eq("follow_user_id", user.getId()).count());
        profile.setFollowing(followService.query().eq("user_id", user.getId()).count());
        profile.setIsMe(currentUser != null && currentUser.getId().equals(user.getId()));
        profile.setIsFollow(currentUser != null && followService.query()
                .eq("user_id", currentUser.getId())
                .eq("follow_user_id", user.getId())
                .count() > 0);
        return Result.ok(profile);
    }

    @Override
    public Result trends() {
        Map<String, Long> trendMap = new LinkedHashMap<>();

        // 行为趋势：优先读取真实搜索词，让搜索建议能随着用户使用自然变化。
        List<Map<String, Object>> searchedKeywords = noteEventMapper.selectMaps(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<NoteEvent>()
                        .select("keyword", "count(*) AS heat")
                        .eq("event_type", "search")
                        .isNotNull("keyword")
                        .groupBy("keyword")
                        .orderByDesc("heat")
                        .last("limit 8"));
        for (Map<String, Object> row : searchedKeywords) {
            putTrend(trendMap, row.get("keyword"), row.get("heat"));
        }

        // 内容趋势：搜索行为不足时，用高赞笔记标题补齐推荐词。
        List<Map<String, Object>> keywordRows = blogService.getBaseMapper().selectMaps(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Blog>()
                        .select("title AS keyword", "liked AS heat")
                        .isNotNull("title")
                        .orderByDesc("liked")
                        .last("limit 8"));
        for (Map<String, Object> row : keywordRows) {
            putTrend(trendMap, row.get("keyword"), row.get("heat"));
        }

        // 运营兜底：数据库内容不足时仍提供可用的产品体验。
        putTrend(trendMap, "附近约会餐厅", 96L);
        putTrend(trendMap, "人均50宝藏店", 88L);
        putTrend(trendMap, "周末拍照咖啡", 76L);
        putTrend(trendMap, "一个人吃饭", 64L);
        putTrend(trendMap, "新店打卡", 58L);

        List<ContentTrendDTO> trends = trendMap.entrySet().stream()
                .limit(10)
                .map(entry -> new ContentTrendDTO(entry.getKey(), entry.getValue()))
                .toList();
        return Result.ok(trends);
    }

    @Override
    public Result aiRecommend(ContentAiRequest request) {
        String query = request == null ? "" : StrUtil.trim(request.getQuery());
        if (StrUtil.isBlank(query)) {
            return Result.fail("推荐问题不能为空");
        }
        AiChatRequest aiRequest = toAiChatRequest(request, buildRecommendPrompt(query));
        return safeAiQuery(aiRequest, "可以先看看「" + query + "」相关笔记，按热度和收藏数挑选更稳。");
    }

    @Override
    public Result aiNoteSummary(ContentAiRequest request) {
        if (request == null) {
            return Result.fail("笔记内容不能为空");
        }
        String title = StrUtil.blankToDefault(StrUtil.trim(request.getTitle()), "未命名笔记");
        String content = StrUtil.trim(request.getContent());
        if (StrUtil.isBlank(content) && request.getNoteId() != null) {
            Blog blog = blogService.getById(request.getNoteId());
            if (blog != null) {
                title = StrUtil.blankToDefault(blog.getTitle(), title);
                content = blog.getContent();
            }
        }
        if (StrUtil.isBlank(content)) {
            return Result.fail("笔记内容不能为空");
        }
        AiChatRequest aiRequest = toAiChatRequest(request, buildNoteSummaryPrompt(title, content));
        return safeAiQuery(aiRequest, "这篇笔记可以重点看标题、图片和评论反馈；智能看点暂时不可用。");
    }

    /**
     * 构造内容流查询条件。
     * hot 使用互动热度 + 新鲜度排序；follow 只看关注作者；nearby 先复用内容搜索，
     * 后续接入店铺坐标或 Redis GEO 后可以在这里替换为真正的附近推荐。
     */
    private Page<Blog> buildFeedQuery(String channel, String query, int pageNo) {
        String normalizedChannel = StrUtil.blankToDefault(channel, "hot");
        Page<Blog> page = new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE);
        var wrapper = blogService.query();
        if (StrUtil.isNotBlank(query)) {
            wrapper.and(w -> w.like("title", query).or().like("content", query));
        }
        if ("follow".equals(normalizedChannel)) {
            UserDTO user = UserHolder.getUser();
            if (user == null) {
                return new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE);
            }
            List<Long> followUserIds = followService.query()
                    .eq("user_id", user.getId())
                    .list()
                    .stream()
                    .map(follow -> follow.getFollowUserId())
                    .toList();
            if (followUserIds.isEmpty()) {
                return new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE);
            }
            wrapper.in("user_id", followUserIds);
        }
        if ("hot".equals(normalizedChannel)) {
            wrapper.last("ORDER BY (IFNULL(liked, 0) * 3 + IFNULL(comments, 0) * 2 + " +
                    "(SELECT COUNT(1) FROM tb_blog_collect c WHERE c.blog_id = tb_blog.id) * 4 + " +
                    "GREATEST(0, 72 - TIMESTAMPDIFF(HOUR, create_time, NOW()))) DESC, create_time DESC");
        } else {
            wrapper.orderByDesc("create_time");
        }
        return wrapper.page(page);
    }

    private ContentFeedResult toFeedResult(Page<Blog> page, String query) {
        List<ContentNoteDTO> list = toNoteDTOs(page.getRecords());
        boolean hasMore = page.getCurrent() < page.getPages();
        return new ContentFeedResult(list, page.getTotal(), hasMore, query);
    }

    private int normalizePage(Integer current) {
        return current == null || current < 1 ? 1 : current;
    }

    /**
     * 按收藏时间顺序批量恢复笔记详情。
     * MyBatis-Plus 的 in 查询不保证顺序，这里按前面的 blogIds 手动排回用户收藏顺序。
     */
    private List<ContentNoteDTO> findNotesByIds(List<Long> blogIds) {
        if (blogIds.isEmpty()) {
            return List.of();
        }
        List<Blog> blogs = blogService.query().in("id", blogIds).list();
        Map<Long, Blog> blogMap = new LinkedHashMap<>();
        for (Blog blog : blogs) {
            blogMap.put(blog.getId(), blog);
        }
        List<Blog> orderedBlogs = new ArrayList<>();
        for (Long blogId : blogIds) {
            Blog blog = blogMap.get(blogId);
            if (blog != null) {
                orderedBlogs.add(blog);
            }
        }
        return toNoteDTOs(orderedBlogs);
    }

    /**
     * 组装前端内容卡片字段。
     * 这里统一补齐作者信息、点赞/收藏/关注状态、互动计数，避免前端为每张卡片多次请求。
     */
    private ContentNoteDTO toNoteDTO(Blog blog) {
        return toNoteDTOs(List.of(blog)).get(0);
    }

    /**
     * 批量组装前端内容卡片字段。
     * 内容流一次通常返回多篇笔记，批量查询作者、收藏数、收藏状态和关注状态，
     * 避免每张卡片都单独访问数据库造成 N+1 查询。
     */
    private List<ContentNoteDTO> toNoteDTOs(List<Blog> blogs) {
        if (blogs == null || blogs.isEmpty()) {
            return List.of();
        }
        List<Long> blogIds = blogs.stream()
                .map(Blog::getId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        List<Long> authorIds = blogs.stream()
                .map(Blog::getUserId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        Map<Long, User> authorMap = loadAuthors(authorIds);
        Map<Long, Long> collectCountMap = loadCollectCounts(blogIds);
        Map<Long, List<MallProduct>> blogProductsMap = loadBlogProducts(blogIds);
        UserDTO currentUser = UserHolder.getUser();
        Set<Long> collectedBlogIds = loadCollectedBlogIds(currentUser, blogIds);
        Set<Long> followedAuthorIds = loadFollowedAuthorIds(currentUser, authorIds);

        return blogs.stream()
                .map(blog -> toNoteDTO(blog, authorMap, collectCountMap, blogProductsMap,
                        collectedBlogIds, followedAuthorIds, currentUser))
                .toList();
    }

    private ContentNoteDTO toNoteDTO(
            Blog blog,
            Map<Long, User> authorMap,
            Map<Long, Long> collectCountMap,
            Map<Long, List<MallProduct>> blogProductsMap,
            Set<Long> collectedBlogIds,
            Set<Long> followedAuthorIds,
            UserDTO currentUser) {
        ContentNoteDTO dto = new ContentNoteDTO();
        dto.setId(blog.getId());
        dto.setShopId(blog.getShopId());
        dto.setUserId(blog.getUserId());
        dto.setTitle(blog.getTitle());
        dto.setImages(blog.getImages());
        dto.setVideoUrl(blog.getVideoUrl());
        dto.setContentType(blog.getContentType());
        dto.setContent(blog.getContent());
        dto.setLiked(blog.getLiked() == null ? 0 : blog.getLiked());
        dto.setComments(blog.getComments() == null ? 0 : blog.getComments());
        dto.setCreateTime(blog.getCreateTime());
        dto.setShop(buildShopDTO(blog.getShopId()));

        User author = authorMap.get(blog.getUserId());
        dto.setName(author == null ? "探店用户" : author.getNickName());
        dto.setIcon(author == null ? "" : author.getIcon());

        if (currentUser == null) {
            dto.setIsLike(false);
            dto.setIsCollect(false);
            dto.setIsFollow(false);
        } else {
            String likedKey = "blog:liked:" + blog.getId();
            dto.setIsLike(stringRedisTemplate.opsForZSet().score(likedKey, currentUser.getId().toString()) != null);
            dto.setIsCollect(collectedBlogIds.contains(blog.getId()));
            dto.setIsFollow(blog.getUserId() != null && followedAuthorIds.contains(blog.getUserId()));
        }
        dto.setCollects(collectCountMap.getOrDefault(blog.getId(), 0L));
        dto.setProducts(blogProductsMap.getOrDefault(blog.getId(), List.of()));
        return dto;
    }

    private Map<Long, List<MallProduct>> loadBlogProducts(List<Long> blogIds) {
        if (blogIds.isEmpty()) {
            return Map.of();
        }
        List<BlogProduct> relations = blogProductMapper.selectList(
                new QueryWrapper<BlogProduct>()
                        .in("blog_id", blogIds)
                        .orderByAsc("sort")
                        .orderByAsc("id"));
        if (relations.isEmpty()) {
            return Map.of();
        }
        List<Long> productIds = relations.stream()
                .map(BlogProduct::getProductId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        if (productIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, MallProduct> productMap = mallProductService.query()
                .in("id", productIds)
                .eq("status", 1)
                .list()
                .stream()
                .collect(Collectors.toMap(MallProduct::getId, Function.identity(), (first, second) -> first));
        Map<Long, List<MallProduct>> result = new LinkedHashMap<>();
        for (BlogProduct relation : relations) {
            MallProduct product = productMap.get(relation.getProductId());
            if (product != null) {
                result.computeIfAbsent(relation.getBlogId(), key -> new ArrayList<>()).add(product);
            }
        }
        return result;
    }

    private ContentShopDTO buildShopDTO(Long shopId) {
        if (shopId == null) {
            return null;
        }
        Shop shop = shopService.getById(shopId);
        if (shop == null) {
            return null;
        }
        ContentShopDTO dto = new ContentShopDTO();
        dto.setId(shop.getId());
        dto.setName(shop.getName());
        dto.setImages(shop.getImages());
        dto.setArea(shop.getArea());
        dto.setAddress(shop.getAddress());
        dto.setAvgPrice(shop.getAvgPrice());
        dto.setSold(shop.getSold());
        dto.setComments(shop.getComments());
        dto.setScore(shop.getScore());
        dto.setOpenHours(shop.getOpenHours());

        // 选一个当前店铺可用的优惠券，让笔记详情自然承接到交易转化。
        Voucher voucher = voucherService.query()
                .eq("shop_id", shopId)
                .eq("status", 1)
                .orderByAsc("pay_value")
                .last("limit 1")
                .one();
        if (voucher != null) {
            dto.setVoucherId(voucher.getId());
            dto.setVoucherTitle(voucher.getTitle());
            dto.setVoucherSubTitle(voucher.getSubTitle());
            dto.setVoucherPayValue(voucher.getPayValue());
            dto.setVoucherActualValue(voucher.getActualValue());
        }
        return dto;
    }

    private Map<Long, User> loadAuthors(List<Long> authorIds) {
        if (authorIds.isEmpty()) {
            return Map.of();
        }
        return userService.listByIds(authorIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (first, second) -> first));
    }

    private Map<Long, Long> loadCollectCounts(List<Long> blogIds) {
        if (blogIds.isEmpty()) {
            return Map.of();
        }
        List<Map<String, Object>> rows = blogCollectService.getBaseMapper().selectMaps(
                new QueryWrapper<BlogCollect>()
                        .select("blog_id", "count(*) AS collect_count")
                        .in("blog_id", blogIds)
                        .groupBy("blog_id"));
        Map<Long, Long> countMap = new HashMap<>();
        for (Map<String, Object> row : rows) {
            countMap.put(toLong(row.get("blog_id")), toLong(row.get("collect_count")));
        }
        return countMap;
    }

    private Set<Long> loadCollectedBlogIds(UserDTO currentUser, List<Long> blogIds) {
        if (currentUser == null || blogIds.isEmpty()) {
            return Set.of();
        }
        return blogCollectService.query()
                .select("blog_id")
                .eq("user_id", currentUser.getId())
                .in("blog_id", blogIds)
                .list()
                .stream()
                .map(BlogCollect::getBlogId)
                .collect(Collectors.toSet());
    }

    private Set<Long> loadFollowedAuthorIds(UserDTO currentUser, List<Long> authorIds) {
        if (currentUser == null || authorIds.isEmpty()) {
            return Set.of();
        }
        return followService.query()
                .select("follow_user_id")
                .eq("user_id", currentUser.getId())
                .in("follow_user_id", authorIds)
                .list()
                .stream()
                .map(follow -> follow.getFollowUserId())
                .collect(Collectors.toSet());
    }

    private Long sumUserLikes(Long userId) {
        List<Blog> blogs = blogService.query().eq("user_id", userId).list();
        return blogs.stream()
                .map(Blog::getLiked)
                .mapToLong(liked -> liked == null ? 0L : liked)
                .sum();
    }

    private Long countUserReceivedCollects(Long userId) {
        List<Long> blogIds = blogService.query().eq("user_id", userId).list().stream()
                .map(Blog::getId)
                .toList();
        if (blogIds.isEmpty()) {
            return 0L;
        }
        return blogCollectService.query().in("blog_id", blogIds).count();
    }

    private void putTrend(Map<String, Long> trendMap, Object keywordValue, Object heatValue) {
        String keyword = keywordValue == null ? "" : String.valueOf(keywordValue).trim();
        if (StrUtil.isBlank(keyword)) {
            return;
        }
        if (keyword.length() > 18) {
            keyword = keyword.substring(0, 18);
        }
        long heat = 0L;
        if (heatValue instanceof Number number) {
            heat = number.longValue();
        }
        trendMap.putIfAbsent(keyword, Math.max(heat, 1L));
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value == null) {
            return 0L;
        }
        return Long.parseLong(String.valueOf(value));
    }

    private AiChatRequest toAiChatRequest(ContentAiRequest request, String message) {
        AiChatRequest aiRequest = new AiChatRequest();
        aiRequest.setSessionId(request == null ? null : request.getSessionId());
        aiRequest.setReset(request == null ? null : request.getReset());
        aiRequest.setMessage(message);
        return aiRequest;
    }

    /**
     * 内容 AI 的降级入口。
     * API Key、网络或模型服务不可用时，不让内容页面报错，只返回可展示的兜底文案。
     */
    private Result safeAiQuery(AiChatRequest request, String fallbackAnswer) {
        try {
            return Result.ok(aiAssistantService.query(request));
        } catch (RuntimeException e) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("answer", fallbackAnswer);
            fallback.put("degraded", true);
            return Result.ok(fallback);
        }
    }

    /**
     * 搜索推荐 prompt 在后端集中维护。
     * 这样前端只关心“用户搜了什么”，不会把模型提示词散落到页面脚本里。
     */
    private String buildRecommendPrompt(String query) {
        return "用户正在内容社区搜索「" + query + "」。" +
                "请给出简短、具体、可执行的探店推荐，优先结合系统里的店铺、优惠券和笔记信息。" +
                "回答控制在 80 字以内，语气像真实内容社区的推荐助手。";
    }

    /**
     * 笔记详情 prompt 在后端集中维护。
     * 用固定结构输出，方便前端直接作为“智能看点”展示在详情页里。
     */
    private String buildNoteSummaryPrompt(String title, String content) {
        return "请总结这篇探店笔记的适合人群、核心亮点和注意事项。" +
                "用三句话回答，不要编号，不要营销套话。" +
                "标题：" + title + "。正文：" + content;
    }
}
