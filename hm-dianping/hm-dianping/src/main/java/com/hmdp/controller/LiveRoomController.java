package com.hmdp.controller;

import com.hmdp.dto.Result;
import com.hmdp.entity.LiveRoom;
import com.hmdp.entity.LiveRoomMessage;
import com.hmdp.entity.LiveRoomProduct;
import com.hmdp.service.ILiveRoomService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 直播模块接口。
 * 覆盖直播间列表、开关播、商品橱窗、互动弹幕和直播回放。
 */
@RestController
@RequestMapping("/live")
public class LiveRoomController {

    @Resource
    private ILiveRoomService liveRoomService;

    @GetMapping("/rooms")
    public Result rooms(@RequestParam(value = "status", required = false) Integer status,
                        @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return liveRoomService.listPublic(status, current);
    }

    @GetMapping("/rooms/{id}")
    public Result detail(@PathVariable("id") Long id) {
        return liveRoomService.detail(id);
    }

    @GetMapping("/rooms/{id}/messages")
    public Result messages(@PathVariable("id") Long id) {
        return liveRoomService.messages(id);
    }

    @GetMapping("/public/rooms")
    public Result publicRooms(@RequestParam(value = "status", required = false) Integer status,
                              @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return liveRoomService.listPublic(status, current);
    }

    @GetMapping("/public/rooms/{id}")
    public Result publicDetail(@PathVariable("id") Long id) {
        return liveRoomService.detail(id);
    }

    @GetMapping("/public/rooms/{id}/messages")
    public Result publicMessages(@PathVariable("id") Long id) {
        return liveRoomService.messages(id);
    }

    @PostMapping("/rooms/{id}/messages")
    public Result sendMessage(@PathVariable("id") Long id, @RequestBody LiveRoomMessage message) {
        return liveRoomService.sendMessage(id, message);
    }

    @PostMapping("/rooms/{id}/like")
    public Result like(@PathVariable("id") Long id) {
        return liveRoomService.likeRoom(id);
    }

    @PostMapping("/rooms/{id}/online")
    public Result online(@PathVariable("id") Long id, @RequestParam("delta") Integer delta) {
        return liveRoomService.updateOnline(id, delta);
    }

    @GetMapping("/merchant/rooms")
    public Result myRooms(@RequestParam(value = "status", required = false) Integer status) {
        return liveRoomService.listMine(status);
    }

    @PostMapping("/merchant/rooms")
    public Result create(@RequestBody LiveRoom room) {
        return liveRoomService.createRoom(room);
    }

    @PostMapping("/merchant/rooms/{id}/open")
    public Result open(@PathVariable("id") Long id) {
        return liveRoomService.openRoom(id);
    }

    @PostMapping("/merchant/rooms/{id}/close")
    public Result close(@PathVariable("id") Long id,
                        @RequestParam(value = "replayVideoUrl", required = false) String replayVideoUrl) {
        return liveRoomService.closeRoom(id, replayVideoUrl);
    }

    @PutMapping("/merchant/rooms/{id}/products")
    public Result updateProducts(@PathVariable("id") Long id, @RequestBody List<LiveRoomProduct> products) {
        return liveRoomService.updateProducts(id, products);
    }
}
