package com.hmdp.controller;

import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.NoteEvent;
import com.hmdp.mapper.NoteEventMapper;
import com.hmdp.utils.UserHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.Resource;

/**
 * 笔记行为采集接口。
 * 前端用来记录曝光、点击、搜索等事件，后续可用于个性化推荐和数据看板。
 */
@RestController
@RequestMapping("/note-event")
public class NoteEventController {

    @Resource
    private NoteEventMapper noteEventMapper;

    @PostMapping
    public Result track(@RequestBody NoteEvent event) {
        UserDTO user = UserHolder.getUser();
        event.setId(null);
        event.setUserId(user == null ? null : user.getId());
        noteEventMapper.insert(event);
        return Result.ok();
    }
}
