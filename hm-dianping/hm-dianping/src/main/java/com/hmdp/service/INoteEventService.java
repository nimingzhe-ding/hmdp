package com.hmdp.service;

import com.hmdp.entity.NoteEvent;
import com.hmdp.enums.EventType;

import java.util.List;

/**
 * 笔记行为事件服务。
 */
public interface INoteEventService {

    /**
     * 记录单条行为事件。
     */
    void track(Long userId, Long blogId, EventType eventType, String scene, String keyword);

    /**
     * 批量记录行为事件。
     */
    void trackBatch(List<NoteEvent> events);
}
