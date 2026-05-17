package com.hmdp.service.impl;

import com.hmdp.entity.NoteEvent;
import com.hmdp.enums.EventType;
import com.hmdp.mapper.NoteEventMapper;
import com.hmdp.service.INoteEventService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class NoteEventServiceImpl implements INoteEventService {

    @Resource
    private NoteEventMapper noteEventMapper;

    @Override
    public void track(Long userId, Long blogId, EventType eventType, String scene, String keyword) {
        try {
            NoteEvent event = new NoteEvent();
            event.setUserId(userId);
            event.setBlogId(blogId);
            event.setEventType(eventType.name());
            event.setScene(scene);
            event.setKeyword(keyword);
            event.setCreateTime(LocalDateTime.now());
            noteEventMapper.insert(event);
        } catch (Exception e) {
            log.warn("行为事件记录失败: userId={}, blogId={}, type={}, error={}", userId, blogId, eventType, e.getMessage());
        }
    }

    @Override
    public void trackBatch(List<NoteEvent> events) {
        if (events == null || events.isEmpty()) return;
        LocalDateTime now = LocalDateTime.now();
        for (NoteEvent event : events) {
            try {
                event.setId(null);
                if (event.getCreateTime() == null) {
                    event.setCreateTime(now);
                }
                noteEventMapper.insert(event);
            } catch (Exception e) {
                log.warn("批量事件记录失败: event={}, error={}", event, e.getMessage());
            }
        }
    }
}
