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
import com.hmdp.dto.ContentProfileUpdateRequest;
import com.hmdp.dto.ContentSearchResult;
import com.hmdp.dto.ContentShopDTO;
import com.hmdp.dto.ContentTrendDTO;
import com.hmdp.dto.CreatorGrowthDTO;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.Blog;
import com.hmdp.entity.BlogCollect;
import com.hmdp.entity.BlogLike;
import com.hmdp.entity.BlogProduct;
import com.hmdp.entity.ContentTopic;
import com.hmdp.entity.Follow;
import com.hmdp.entity.MallProduct;
import com.hmdp.entity.NoteEvent;
import com.hmdp.entity.Shop;
import com.hmdp.entity.User;
import com.hmdp.entity.UserInfo;
import com.hmdp.entity.Voucher;
import com.hmdp.enums.ContentType;
import com.hmdp.mapper.BlogLikeMapper;
import com.hmdp.mapper.BlogProductMapper;
import com.hmdp.mapper.ContentTopicMapper;
import com.hmdp.mapper.NoteEventMapper;
import com.hmdp.service.IBlogCollectService;
import com.hmdp.service.IBlogService;
import com.hmdp.service.IContentService;
import com.hmdp.service.IFollowService;
import com.hmdp.service.IMallProductService;
import com.hmdp.service.IShopService;
import com.hmdp.service.IUserInfoService;
import com.hmdp.service.IUserService;
import com.hmdp.service.IVoucherService;
import com.hmdp.utils.SystemConstants;
import com.hmdp.utils.UserHolder;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.util.ArrayList;
import java.time.LocalDate;
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
    private IUserInfoService userInfoService;

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
    private BlogLikeMapper blogLikeMapper;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Resource
    private NoteEventMapper noteEventMapper;

    @Resource
    private ContentTopicMapper contentTopicMapper;

    @Resource
    private AiAssistantService aiAssistantService;

    @Override
    public Result feed(String channel, String query, Integer current) {
        int pageNo = normalizePage(current);
        Page<Blog> page = buildFeedQuery(channel, query, pageNo);
        return Result.ok(toFeedResult(page, query));
    }

    @Override
    public Result search(String query, Integer current) {
        String keyword = StrUtil.trim(query);
        if (StrUtil.isBlank(keyword)) {
            return Result.fail("搜索词不能为空");
        }
        int pageNo = normalizePage(current);
        Page<Blog> notePage = buildFeedQuery("hot", keyword, pageNo);
        List<ContentNoteDTO> notes = toNoteDTOs(notePage.getRecords());
        List<ContentNoteDTO> videos = notes.stream()
                .filter(this::isVideoNote)
                .toList();

        ContentSearchResult result = new ContentSearchResult();
        result.setQuery(keyword);
        result.setNotes(notes);
        result.setVideos(videos);
        result.setProducts(searchProducts(keyword, pageNo));
        result.setShops(searchShops(keyword, pageNo));
        result.setTopics(searchTopics(keyword));
        return Result.ok(result);
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
        ContentNoteDTO note = toNoteDTO(blog);
        note.setCreatorGrowth(buildCreatorGrowth(blog.getUserId()));
        note.setRelatedNotes(findRelatedNotes(blog));
        return Result.ok(note);
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
        return userCollections(user.getId(), current);
    }

    @Override
    public Result liked(Integer current) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        return userLiked(user.getId(), current);
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
    public Result userCollections(Long userId, Integer current) {
        if (userId == null) {
            return Result.fail("用户ID不能为空");
        }
        int pageNo = normalizePage(current);
        Page<BlogCollect> collectPage = blogCollectService.query()
                .eq("user_id", userId)
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
    public Result userLiked(Long userId, Integer current) {
        if (userId == null) {
            return Result.fail("用户ID不能为空");
        }
        List<Long> likedBlogIds = findLikedBlogIds(userId);
        int pageNo = normalizePage(current);
        int from = Math.min((pageNo - 1) * SystemConstants.MAX_PAGE_SIZE, likedBlogIds.size());
        int to = Math.min(from + SystemConstants.MAX_PAGE_SIZE, likedBlogIds.size());
        List<ContentNoteDTO> notes = findNotesByIds(likedBlogIds.subList(from, to));
        boolean hasMore = to < likedBlogIds.size();
        return Result.ok(new ContentFeedResult(notes, (long) likedBlogIds.size(), hasMore, null));
    }

    @Override
    public Result following(Long userId, Integer current) {
        if (userId == null) {
            return Result.fail("用户ID不能为空");
        }
        int pageNo = normalizePage(current);
        Page<Follow> page = followService.query()
                .eq("user_id", userId)
                .orderByDesc("create_time")
                .page(new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE));
        List<Long> userIds = page.getRecords().stream()
                .map(Follow::getFollowUserId)
                .toList();
        return Result.ok(findUsersByIds(userIds), page.getTotal());
    }

    @Override
    public Result followers(Long userId, Integer current) {
        if (userId == null) {
            return Result.fail("用户ID不能为空");
        }
        int pageNo = normalizePage(current);
        Page<Follow> page = followService.query()
                .eq("follow_user_id", userId)
                .orderByDesc("create_time")
                .page(new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE));
        List<Long> userIds = page.getRecords().stream()
                .map(Follow::getUserId)
                .toList();
        return Result.ok(findUsersByIds(userIds), page.getTotal());
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
        UserInfo info = userInfoService.getById(user.getId());
        profile.setIntroduce(info == null ? "" : info.getIntroduce());
        profile.setCity(info == null ? "" : info.getCity());
        profile.setNotes(blogService.query().eq("user_id", user.getId()).count());
        profile.setLikes(sumUserLikes(user.getId()));
        profile.setCollects(blogCollectService.query().eq("user_id", user.getId()).count());
        profile.setFollowers(followService.query().eq("follow_user_id", user.getId()).count());
        profile.setFollowing(followService.query().eq("user_id", user.getId()).count());
        profile.setIsMe(currentUser != null && currentUser.getId().equals(user.getId()));
        profile.setIsFollow(currentUser != null && followService.query()
                .eq("user_id", currentUser.getId())
                .eq("follow_user_id", user.getId())
                .count() > 0);
        profile.setCreatorGrowth(buildCreatorGrowth(user.getId()));
        return Result.ok(profile);
    }

    @Override
    public Result updateProfile(ContentProfileUpdateRequest request) {
        UserDTO currentUser = UserHolder.getUser();
        if (currentUser == null) {
            return Result.fail("请先登录");
        }
        if (request == null) {
            return Result.fail("资料不能为空");
        }
        User user = userService.getById(currentUser.getId());
        if (user == null) {
            return Result.fail("用户不存在");
        }
        String nickName = StrUtil.trim(request.getNickName());
        String icon = StrUtil.trim(request.getIcon());
        if (StrUtil.isNotBlank(nickName)) {
            user.setNickName(StrUtil.sub(nickName, 0, 30));
        }
        if (StrUtil.isNotBlank(icon)) {
            user.setIcon(StrUtil.sub(icon, 0, 512));
        }
        userService.updateById(user);

        UserInfo info = userInfoService.getById(currentUser.getId());
        if (info == null) {
            info = new UserInfo();
            info.setUserId(currentUser.getId());
        }
        info.setIntroduce(StrUtil.sub(StrUtil.trimToEmpty(request.getIntroduce()), 0, 128));
        info.setCity(StrUtil.sub(StrUtil.trimToEmpty(request.getCity()), 0, 32));
        userInfoService.saveOrUpdate(info);

        currentUser.setNickName(user.getNickName());
        currentUser.setIcon(user.getIcon());
        return profile(currentUser.getId());
    }

    @Override
    public Result trends() {
        return Result.ok(buildTrendList(10));
    }

    private List<ContentTrendDTO> buildTrendList(int limit) {
        Map<String, Long> trendMap = new LinkedHashMap<>();
        Map<String, Long> noteCountMap = new HashMap<>();

        // 话题趋势：优先读取独立话题表，避免每次从正文临时解析。
        List<ContentTopic> topics = contentTopicMapper.selectList(
                new QueryWrapper<ContentTopic>()
                        .orderByDesc("heat")
                        .orderByDesc("note_count")
                        .last("limit " + Math.max(limit, 10)));
        for (ContentTopic topic : topics) {
            putTrend(trendMap, topic.getKeyword(), topic.getHeat());
            noteCountMap.put(topic.getKeyword(), topic.getNoteCount() == null ? 0L : topic.getNoteCount());
        }

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

        return trendMap.entrySet().stream()
                .limit(limit)
                .map(entry -> new ContentTrendDTO(entry.getKey(), entry.getValue(), noteCountMap.getOrDefault(entry.getKey(), 0L)))
                .toList();
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
            wrapper.and(w -> w.like("title", query).or().like("content", query).or().like("tags", query));
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
        if ("video".equals(normalizedChannel)) {
            wrapper.in("content_type", ContentType.VIDEO.name(), ContentType.LIVE.name());
        }
        if ("mall".equals(normalizedChannel)) {
            wrapper.and(w -> w.eq("content_type", ContentType.PRODUCT_NOTE.name())
                    .or()
                    .inSql("id", "select blog_id from tb_blog_product"));
        }
        if ("hot".equals(normalizedChannel)) {
            wrapper.last("ORDER BY (IFNULL(liked, 0) * 3 + IFNULL(comments, 0) * 2 + " +
                    "(SELECT COUNT(1) FROM tb_blog_collect c WHERE c.blog_id = tb_blog.id) * 4 + " +
                    "GREATEST(0, 72 - TIMESTAMPDIFF(HOUR, create_time, NOW()))) DESC, create_time DESC");
        } else if ("nearby".equals(normalizedChannel)) {
            wrapper.last("ORDER BY CASE WHEN shop_id IS NULL THEN 1 ELSE 0 END ASC, create_time DESC");
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

    private boolean isVideoNote(ContentNoteDTO note) {
        if (note == null || StrUtil.isBlank(note.getVideoUrl())) {
            return false;
        }
        String contentType = StrUtil.blankToDefault(note.getContentType(), "");
        return ContentType.VIDEO.name().equals(contentType) || ContentType.LIVE.name().equals(contentType);
    }

    private List<ContentNoteDTO> findRelatedNotes(Blog source) {
        if (source == null || source.getId() == null) {
            return List.of();
        }
        QueryWrapper<Blog> wrapper = new QueryWrapper<Blog>()
                .ne("id", source.getId());
        List<String> tags = splitTags(source.getTags());
        if (!tags.isEmpty() || StrUtil.isNotBlank(source.getContentType()) || source.getShopId() != null) {
            wrapper.and(w -> {
                int[] conditionCount = {0};
                for (String tag : tags) {
                    if (conditionCount[0]++ > 0) w.or();
                    w.like("tags", tag);
                }
                if (StrUtil.isNotBlank(source.getContentType())) {
                    if (conditionCount[0]++ > 0) w.or();
                    w.eq("content_type", source.getContentType());
                }
                if (source.getShopId() != null) {
                    if (conditionCount[0] > 0) w.or();
                    w.eq("shop_id", source.getShopId());
                }
            });
        }
        wrapper.last("ORDER BY (IFNULL(liked, 0) * 3 + IFNULL(comments, 0) * 2 + " +
                "GREATEST(0, 168 - TIMESTAMPDIFF(HOUR, create_time, NOW()))) DESC, create_time DESC LIMIT 6");
        List<Blog> related = blogService.getBaseMapper().selectList(wrapper);
        return toNoteDTOs(related);
    }

    private List<String> splitTags(String tags) {
        if (StrUtil.isBlank(tags)) {
            return List.of();
        }
        return StrUtil.split(tags, ',')
                .stream()
                .map(String::trim)
                .filter(StrUtil::isNotBlank)
                .distinct()
                .limit(6)
                .toList();
    }

    private List<MallProduct> searchProducts(String keyword, int pageNo) {
        return mallProductService.query()
                .eq("status", 1)
                .and(wrapper -> wrapper.like("title", keyword)
                        .or()
                        .like("sub_title", keyword)
                        .or()
                        .like("category", keyword))
                .orderByDesc("sold")
                .orderByDesc("create_time")
                .page(new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE))
                .getRecords();
    }

    private List<Shop> searchShops(String keyword, int pageNo) {
        return shopService.query()
                .and(wrapper -> wrapper.like("name", keyword)
                        .or()
                        .like("area", keyword)
                        .or()
                        .like("address", keyword))
                .orderByDesc("sold")
                .orderByDesc("score")
                .page(new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE))
                .getRecords();
    }

    private List<ContentTrendDTO> searchTopics(String keyword) {
        List<ContentTrendDTO> trends = buildTrendList(20);
        List<ContentTrendDTO> matched = trends.stream()
                .filter(trend -> StrUtil.isNotBlank(trend.getKeyword()))
                .filter(trend -> trend.getKeyword().contains(keyword) || keyword.contains(trend.getKeyword()))
                .limit(12)
                .toList();
        if (!matched.isEmpty()) {
            return matched;
        }
        return List.of(new ContentTrendDTO(keyword, 1L));
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

    private List<Long> findLikedBlogIds(Long userId) {
        return blogLikeMapper.selectList(new QueryWrapper<BlogLike>()
                        .eq("user_id", userId)
                        .orderByDesc("create_time"))
                .stream()
                .map(BlogLike::getBlogId)
                .toList();
    }

    private List<UserDTO> findUsersByIds(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return List.of();
        }
        List<User> users = userService.listByIds(userIds);
        Map<Long, User> userMap = users.stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (first, second) -> first));
        List<UserDTO> result = new ArrayList<>();
        for (Long userId : userIds) {
            User user = userMap.get(userId);
            if (user != null) {
                UserDTO dto = new UserDTO();
                dto.setId(user.getId());
                dto.setNickName(user.getNickName());
                dto.setIcon(user.getIcon());
                result.add(dto);
            }
        }
        return result;
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
        dto.setTags(blog.getTags());
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
            dto.setIsOwner(false);
        } else {
            String likedKey = "blog:liked:" + blog.getId();
            dto.setIsLike(stringRedisTemplate.opsForZSet().score(likedKey, currentUser.getId().toString()) != null);
            dto.setIsCollect(collectedBlogIds.contains(blog.getId()));
            dto.setIsFollow(blog.getUserId() != null && followedAuthorIds.contains(blog.getUserId()));
            dto.setIsOwner(blog.getUserId() != null && blog.getUserId().equals(currentUser.getId()));
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

    private CreatorGrowthDTO buildCreatorGrowth(Long userId) {
        CreatorGrowthDTO growth = new CreatorGrowthDTO();
        if (userId == null) {
            growth.setLevel(1);
            growth.setLevelName("Lv.1 新锐创作者");
            growth.setScore(0L);
            growth.setContinuousPublishDays(0);
            growth.setQualityCreator(false);
            growth.setBadges(List.of("新锐创作者"));
            return growth;
        }
        List<Blog> blogs = blogService.query()
                .eq("user_id", userId)
                .orderByDesc("create_time")
                .list();
        long notes = blogs.size();
        long likes = blogs.stream().map(Blog::getLiked).mapToLong(value -> value == null ? 0L : value).sum();
        long collects = countUserReceivedCollects(userId);
        long followers = followService.query().eq("follow_user_id", userId).count();
        int streak = countPublishStreak(blogs);
        long score = notes * 20 + likes * 2 + collects * 3 + followers * 5 + streak * 15;
        int level = Math.max(1, Math.min(9, (int) (score / 120) + 1));
        boolean qualityCreator = notes >= 5 && (likes >= 100 || followers >= 10 || collects >= 20);
        List<String> badges = buildCreatorBadges(blogs, likes, collects, followers, streak, qualityCreator);

        growth.setLevel(level);
        growth.setLevelName("Lv." + level + " " + resolveLevelName(level));
        growth.setScore(score);
        growth.setContinuousPublishDays(streak);
        growth.setQualityCreator(qualityCreator);
        growth.setBadges(badges);
        return growth;
    }

    private int countPublishStreak(List<Blog> blogs) {
        List<LocalDate> dates = blogs.stream()
                .map(Blog::getCreateTime)
                .filter(time -> time != null)
                .map(time -> time.toLocalDate())
                .distinct()
                .toList();
        if (dates.isEmpty()) {
            return 0;
        }
        int streak = 1;
        LocalDate cursor = dates.get(0);
        for (int i = 1; i < dates.size(); i++) {
            LocalDate next = dates.get(i);
            if (cursor.minusDays(1).equals(next)) {
                streak++;
                cursor = next;
            } else {
                break;
            }
        }
        return streak;
    }

    private List<String> buildCreatorBadges(List<Blog> blogs, long likes, long collects, long followers, int streak, boolean qualityCreator) {
        List<String> badges = new ArrayList<>();
        if (qualityCreator) badges.add("优质创作者");
        if (streak >= 3) badges.add("连续发布");
        if (likes >= 100) badges.add("人气作者");
        if (collects >= 20) badges.add("收藏达人");
        if (followers >= 10) badges.add("被关注");
        if (blogs.stream().anyMatch(blog -> ContentType.VIDEO.name().equals(blog.getContentType()) || ContentType.LIVE.name().equals(blog.getContentType()))) {
            badges.add("视频创作者");
        }
        if (blogs.stream().anyMatch(blog -> ContentType.PRODUCT_NOTE.name().equals(blog.getContentType()))) {
            badges.add("带货种草");
        }
        if (badges.isEmpty()) {
            badges.add("新锐创作者");
        }
        return badges.stream().distinct().limit(5).toList();
    }

    private String resolveLevelName(int level) {
        if (level >= 8) return "头部创作者";
        if (level >= 6) return "资深创作者";
        if (level >= 4) return "活跃创作者";
        if (level >= 2) return "成长创作者";
        return "新锐创作者";
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
