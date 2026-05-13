package com.hmdp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 搜索趋势 DTO。
 * 当前以搜索行为和内容热度生成趋势词，后续可以替换为独立运营配置或推荐系统结果。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContentTrendDTO {
    private String keyword;
    private Long heat;
}
