package com.hmdp.utils;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.hmdp.entity.Shop;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.events.Event;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

@Component
@Slf4j
public class CacheClient {
    private final StringRedisTemplate stringRedisTemplate;


    public CacheClient(StringRedisTemplate stringRedisTemplate){
        this.stringRedisTemplate = stringRedisTemplate;
    }


    public void set(String key, Object value, Long time, TimeUnit timeUnit){
        stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(value),time,java.util.concurrent.TimeUnit.SECONDS);
    }

    /**
     * 逻辑过期方式存储缓存
     * @param key
     * @param value
     * @param time
     * @param timeUnit
     */
    public void setWithLogic(String key, Object value, Long time, TimeUnit timeUnit){
        //设置逻辑过期时间
        RedisData redisData = new RedisData();
        redisData.setData(value);
        redisData.setExpireTime(LocalDateTime.now().plusSeconds(timeUnit.toSeconds(time)));
        //写入redis
        stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(redisData));
    }

    public <R,ID>R queryWithPassThrough(String keyPrefix, ID id, Class<R> type, Function<ID,R> dbFallback,Long time, TimeUnit timeUnit){
        String key = keyPrefix + id.toString();
        //1.从redis中查询商铺缓存
        String shopJson = stringRedisTemplate.opsForValue().get(key);
        //2.如果存在，直接返回
        if (StrUtil.isNotBlank(shopJson)) {
            //存在，直接返回
            return  JSONUtil.toBean(shopJson, type);
        }
        //2.1.命中的是空值，返回错误
        if (shopJson != null) {
            return null;
        }
        //3.不存在，根据id查询数据库
        R r = dbFallback.apply(id);

        //4.不存在，返回错误
        if (r == null) {
            //将空值写入到redis缓存，防止缓存穿透
            stringRedisTemplate.opsForValue().set(RedisConstants.CACHE_SHOP_KEY + id, "",2L, TimeUnit.MINUTES);
            return null;
        }
        //5.存在，写入redis缓存
        this.set(key, r, time, timeUnit);
        //6.返回
        return r;
    }


    /**
     * 尝试获取锁
     * @param key
     * @return
     */
    private boolean tryLock(String key){
        Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", 10, TimeUnit.SECONDS);
        return Boolean.TRUE.equals(flag);
    }

    /**
     * 释放锁
     * @param key
     */
    private void unlock(String key){
        stringRedisTemplate.delete(key);
    }
    public void unlock1(String key){
        stringRedisTemplate.delete(key);
    }
    public <R,ID>R queryWithLogicalExpire(String keyPrefix,ID id,Class<R> type, Long time, TimeUnit timeUnit,Function<ID,R> dbFallback){
        String key = keyPrefix + id.toString();
        //1.从redis中查询商铺缓存
        String shopJson = stringRedisTemplate.opsForValue().get(RedisConstants.CACHE_SHOP_KEY + id);
        //2.如果存在，直接返回
        if (StrUtil.isBlank(shopJson)) {

            return  null;
        }
        //命中，需要将json反序列化为对象
        RedisData redisData = JSONUtil.toBean(shopJson, RedisData.class);
        R r = JSONUtil.toBean((JSONObject) redisData.getData(), type);
        LocalDateTime expireTime = redisData.getExpireTime();
        //3.判断是否过期
        if (expireTime.isAfter(LocalDateTime.now())) {
            //3.1.未过期，直接返回店铺信息
            return r;
        }
        //3.2.已过期，需要缓存重建
        //4.获取互斥锁
        String lockKey = RedisConstants.LOCK_SHOP_KEY+id;
        boolean isLock = tryLock(lockKey);
        //5.判断是否获取锁成功

        if(!isLock){
            //5.1.失败，直接返回过期的店铺信息
            return r;
        }
        //5.2.成功，开启独立线程，实现缓存重建
        //注意：这里使用线程池会更好一些
        new Thread(()->{
            try {
                //重建缓存
                R r1 = dbFallback.apply(id);
                this.setWithLogic(key, r1, time, timeUnit);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }finally {
                //释放锁
                unlock(lockKey);
            }
        }).start();
        //6.返回过期的店铺信息
        return r;
    }


}
