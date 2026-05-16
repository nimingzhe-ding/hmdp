package com.hmdp.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 直播间主体。
 * 承载主播、商家、直播状态、回放视频和直播间实时统计。
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("tb_live_room")
public class LiveRoom implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;
    private Long merchantId;
    private Long anchorUserId;
    private Long blogId;
    private String title;
    private String coverUrl;
    private String streamUrl;
    private String replayVideoUrl;
    private Integer status;
    private Integer onlineCount;
    private Integer liked;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    @TableField(exist = false)
    private List<Long> productIds;

    @TableField(exist = false)
    private List<LiveRoomProduct> products;
}
