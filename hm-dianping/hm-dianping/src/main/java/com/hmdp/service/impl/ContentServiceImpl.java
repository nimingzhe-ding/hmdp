package com.hmdp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hmdp.dto.ContentFeedResult;
import com.hmdp.dto.ContentNoteDTO;
import com.hmdp.dto.ContentProfileDTO;
import com.hmdp.dto.ContentTrendDTO;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.Blog;
import com.hmdp.entity.BlogCollect;
import com.hmdp.entity.NoteEvent;
import com.hmdp.entity.User;
import com.hmdp.mapper.NoteEventMapper;
import com.hmdp.service.IBlogCollectService;
import com.hmdp.service.IBlogService;
import com.hmdp.service.IContentService;
import com.hmdp.service.IFollowService;
import com.hmdp.service.IUserService;
import com.hmdp.utils.SystemConstants;
import com.hmdp.utils.UserHolder;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
    private IFollowService followService;

    @Resource
    private IBlogCollectService blogCollectService;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Resource
    private NoteEventMapper noteEventMapper;

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
        List<ContentNoteDTO> list = page.getRecords().stream()
                .map(this::toNoteDTO)
                .toList();
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
        List<ContentNoteDTO> notes = new ArrayList<>();
        for (Long blogId : blogIds) {
            Blog blog = blogMap.get(blogId);
            if (blog != null) {
                notes.add(toNoteDTO(blog));
            }
        }
        return notes;
    }

    /**
     * 组装前端内容卡片字段。
     * 这里统一补齐作者信息、点赞/收藏/关注状态、互动计数，避免前端为每张卡片多次请求。
     */
    private ContentNoteDTO toNoteDTO(Blog blog) {
        ContentNoteDTO dto = new ContentNoteDTO();
        dto.setId(blog.getId());
        dto.setShopId(blog.getShopId());
        dto.setUserId(blog.getUserId());
        dto.setTitle(blog.getTitle());
        dto.setImages(blog.getImages());
        dto.setContent(blog.getContent());
        dto.setLiked(blog.getLiked() == null ? 0 : blog.getLiked());
        dto.setComments(blog.getComments() == null ? 0 : blog.getComments());
        dto.setCreateTime(blog.getCreateTime());

        User author = userService.getById(blog.getUserId());
        dto.setName(author == null ? "探店用户" : author.getNickName());
        dto.setIcon(author == null ? "" : author.getIcon());

        UserDTO currentUser = UserHolder.getUser();
        if (currentUser == null) {
            dto.setIsLike(false);
            dto.setIsCollect(false);
            dto.setIsFollow(false);
        } else {
            String likedKey = "blog:liked:" + blog.getId();
            dto.setIsLike(stringRedisTemplate.opsForZSet().score(likedKey, currentUser.getId().toString()) != null);
            dto.setIsCollect(Boolean.TRUE.equals(blogCollectService.isCollected(blog.getId()).getData()));
            dto.setIsFollow(blog.getUserId() != null && followService.query()
                    .eq("user_id", currentUser.getId())
                    .eq("follow_user_id", blog.getUserId())
                    .count() > 0);
        }
        dto.setCollects(blogCollectService.query().eq("blog_id", blog.getId()).count());
        return dto;
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
}
