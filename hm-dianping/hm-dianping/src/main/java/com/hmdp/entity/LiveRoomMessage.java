package com.hmdp.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 直播互动消息。
 * type 预留 danmaku、like、system 等类型，第一版主要用于直播弹幕。
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("tb_live_room_message")
public class LiveRoomMessage implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;
    private Long roomId;
    private Long userId;
    private String type;
    private String content;
    private Integer liked;
    private Integer status;
    private LocalDateTime createTime;
}
