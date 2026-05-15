package com.hmdp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.Blog;
import com.hmdp.entity.BlogCollect;
import com.hmdp.mapper.BlogCollectMapper;
import com.hmdp.service.IBlogCollectService;
import com.hmdp.service.IBlogService;
import com.hmdp.service.IUserNotificationService;
import com.hmdp.utils.UserHolder;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

/**
 * 笔记收藏业务实现。
 * 收藏数据落库，前端可用它恢复收藏状态，后续也方便扩展收藏列表。
 */
@Service
public class BlogCollectServiceImpl extends ServiceImpl<BlogCollectMapper, BlogCollect> implements IBlogCollectService {
    @Resource
    private IBlogService blogService;

    @Resource
    private IUserNotificationService notificationService;

    @Override
    public Result collectBlog(Long blogId, Boolean collect) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        if (blogId == null) {
            return Result.fail("笔记ID不能为空");
        }
        Long userId = user.getId();
        if (Boolean.TRUE.equals(collect)) {
            long count = query().eq("user_id", userId).eq("blog_id", blogId).count();
            if (count == 0) {
                BlogCollect blogCollect = new BlogCollect();
                blogCollect.setUserId(userId);
                blogCollect.setBlogId(blogId);
                save(blogCollect);
                Blog blog = blogService.getById(blogId);
                if (blog != null) {
                    notificationService.notifyUser(blog.getUserId(), userId, "COLLECT", "有人收藏了你的笔记",
                            "你的笔记《" + (blog.getTitle() == null ? "未命名笔记" : blog.getTitle()) + "》被收藏了。", blogId, null);
                }
            }
        } else {
            remove(new QueryWrapper<BlogCollect>()
                    .eq("user_id", userId)
                    .eq("blog_id", blogId));
        }
        return Result.ok();
    }

    @Override
    public Result isCollected(Long blogId) {
        UserDTO user = UserHolder.getUser();
        if (user == null || blogId == null) {
            return Result.ok(false);
        }
        long count = query().eq("user_id", user.getId()).eq("blog_id", blogId).count();
        return Result.ok(count > 0);
    }
}
