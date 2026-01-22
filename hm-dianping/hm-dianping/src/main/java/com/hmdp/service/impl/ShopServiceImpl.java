package com.hmdp.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.hmdp.dto.Result;
import com.hmdp.entity.Shop;
import com.hmdp.mapper.ShopMapper;
import com.hmdp.service.IShopService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.utils.CacheClient;
import com.hmdp.utils.RedisConstants;
import com.hmdp.utils.RedisData;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Service
public class ShopServiceImpl extends ServiceImpl<ShopMapper, Shop> implements IShopService {
    @Resource
    private StringRedisTemplate stringRedisTemplate;
    @Resource
    private CacheClient cacheClient;
    /**
     * 根据id查询商铺信息
     * @param id
     * @return
     */
    @Override
    public Result queryById(Long id) {
        //缓存穿透解决方案
        //Shop shop = cacheClient.queryWithPassThrough(RedisConstants.CACHE_SHOP_KEY,id, Shop.class,this::getById,30L, TimeUnit.MINUTES);
        //缓存击穿（互斥锁）解决方案
//
   Shop shop = queryWithMutex(id);
        //（逻辑过期）解决方案
        //Shop shop = cacheClient.queryWithLogicalExpire(RedisConstants.CACHE_SHOP_KEY,id, Shop.class,30L, TimeUnit.SECONDS,this::getById);
        if (shop == null) {
            return Result.fail("店铺不存在！");
        }
        //6.返回
        return Result.ok(shop);
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

    /**
     * 将店铺信息保存到redis
     * @param id
     * @param expireSeconds
     */
    private  void saveShopToRedis(Long id,Long expireSeconds){
        //1.查询店铺数据
        Shop shop = getById(id);
        //2.封装逻辑过期时间
        RedisData redisData = new RedisData();
        redisData.setData(shop);
        redisData.setExpireTime(LocalDateTime.now().plusSeconds(expireSeconds));
        //3.写入redis
        stringRedisTemplate.opsForValue().set(RedisConstants.CACHE_SHOP_KEY + id, JSONUtil.toJsonStr(redisData));
    }
    /**
     * 更新商铺信息
     * @param shop
     * @return
     */
    @Override
    @Transactional
    public Result update(Shop shop) {
        Long id = shop.getId();
        if (id == null) {
            return Result.fail("店铺id不能为空！");
        }
        //更新数据库
        updateById(shop);
        //删除缓存
        stringRedisTemplate.delete(RedisConstants.CACHE_SHOP_KEY +id);
        return Result.ok(shop);
    }
    /**
     * 根据id查询商铺信息-缓存击穿解决方案
     * @param id
     * @return
     */
    public Shop  queryWithMutex(Long id){
        //1.从redis中查询商铺缓存
        String shopJson = stringRedisTemplate.opsForValue().get(RedisConstants.CACHE_SHOP_KEY + id);
        //2.如果存在，直接返回
        if (StrUtil.isNotBlank(shopJson)) {
            //存在，直接返回
            Shop shop = JSONUtil.toBean(shopJson, Shop.class);
            return  shop;
        }
        //2.1.命中的是空值，返回错误
        if (shopJson != null) {
            return null;
        }
        //实现缓存重建
        String lockKey = RedisConstants.LOCK_SHOP_KEY+id;
        //获取互斥锁
        Shop shop = null;
        try {
            boolean isLock = tryLock(lockKey);
            //判断是否获取成功
            if(!isLock){
                //失败，休眠并重试

                    Thread.sleep(50);

                return queryWithMutex(id);
            }
            //成功。根据id查询数据库
            shop = getById(id);
            //4.不存在，返回错误
            if (shop == null) {
                //将空值写入到redis缓存，防止缓存穿透
                stringRedisTemplate.opsForValue().set(RedisConstants.CACHE_SHOP_KEY + id, "",2L, TimeUnit.MINUTES);
                return null;
            }
            //5.存在，写入redis缓存
            stringRedisTemplate.opsForValue().set(RedisConstants.CACHE_SHOP_KEY + id, JSONUtil.toJsonStr(shop),30L, TimeUnit.MINUTES);

        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }finally {
            //6.释放互斥锁，返回
            unlock(lockKey);
        }
        return shop;
    }

    /**
     * 根据id查询商铺信息-逻辑过期解决方案
     * @param id
     * @return
     */
//    public Shop  queryWithLogicalExpire(Long id){
//        //1.从redis中查询商铺缓存
//        String shopJson = stringRedisTemplate.opsForValue().get(RedisConstants.CACHE_SHOP_KEY + id);
//        //2.如果存在，直接返回
//        if (StrUtil.isBlank(shopJson)) {
//
//            return  null;
//        }
//        //命中，需要将json反序列化为对象
//        RedisData redisData = JSONUtil.toBean(shopJson, RedisData.class);
//        Shop shop = JSONUtil.toBean((JSONUtil.toJsonStr(redisData.getData())), Shop.class);
//        LocalDateTime expireTime = redisData.getExpireTime();
//        //3.判断是否过期
//        if (expireTime.isAfter(LocalDateTime.now())) {
//            //3.1.未过期，直接返回店铺信息
//            return shop;
//        }
//        //3.2.已过期，需要缓存重建
//        //4.获取互斥锁
//        String lockKey = RedisConstants.LOCK_SHOP_KEY+id;
//        boolean isLock = tryLock(lockKey);
//        //5.判断是否获取锁成功
//
//        if(!isLock){
//            //5.1.失败，直接返回过期的店铺信息
//            return shop;
//        }
//        //5.2.成功，开启独立线程，实现缓存重建
//        //注意：这里使用线程池会更好一些
//        new Thread(()->{
//            try {
//                //重建缓存
//                saveShopToRedis(id,30L);
//            } catch (Exception e) {
//                throw new RuntimeException(e);
//            }finally {
//                //释放锁
//                unlock(lockKey);
//            }
//        }).start();
//        //6.返回过期的店铺信息
//        return shop;
//    }
    public Shop queryWithLogicalExpire(Long id) {
        // 1. 从 redis 中查询商铺缓存
        String shopJson = stringRedisTemplate.opsForValue().get(RedisConstants.CACHE_SHOP_KEY + id);

        // 2. 判断是否存在
        if (StrUtil.isBlank(shopJson)) {
            // 逻辑过期方案假定热点 Key 已预热，如果不存在直接返回 null
            return null;
        }

        // 3. 命中，反序列化
        RedisData redisData = JSONUtil.toBean(shopJson, RedisData.class);
        // 这里是关键！从 RedisData 的 data 字段（JSONObject）转为 Shop
        Object data = redisData.getData();
        Shop shop = JSONUtil.toBean(JSONUtil.parseObj(data), Shop.class);

        LocalDateTime expireTime = redisData.getExpireTime();

        // 4. 判断是否过期
        if (expireTime.isAfter(LocalDateTime.now())) {
            // 未过期，直接返回
            return shop;
        }

        // 5. 已过期，缓存重建
        String lockKey = RedisConstants.LOCK_SHOP_KEY + id;
        boolean isLock = tryLock(lockKey);
        if (isLock) {
            // 获取锁成功，开启独立线程
            new Thread(() -> {
                try {
                    // 重建缓存
                    this.saveShopToRedis(id, 20L); // 建议测试时过期时间设短点
                } catch (Exception e) {
                    throw new RuntimeException(e);
                } finally {
                    unlock(lockKey);
                }
            }).start();
        }
        // 获取锁失败或正在重建，都先返回旧数据
        return shop;
    }

    /**
     * 根据id查询商铺信息-缓存穿透解决方案
     * @param id
     * @return
     */
//    public Shop  queryWithPassThrough(Long id){
//        //1.从redis中查询商铺缓存
//        String shopJson = stringRedisTemplate.opsForValue().get(RedisConstants.CACHE_SHOP_KEY + id);
//        //2.如果存在，直接返回
//        if (StrUtil.isNotBlank(shopJson)) {
//            //存在，直接返回
//            Shop shop = JSONUtil.toBean(shopJson, Shop.class);
//            return  shop;
//        }
//        //2.1.命中的是空值，返回错误
//        if (shopJson != null) {
//            return null;
//        }
//        //3.不存在，根据id查询数据库
//        Shop shop = getById(id);
//
//        //4.不存在，返回错误
//        if (shop == null) {
//            //将空值写入到redis缓存，防止缓存穿透
//            stringRedisTemplate.opsForValue().set(RedisConstants.CACHE_SHOP_KEY + id, "",2L, TimeUnit.MINUTES);
//            return null;
//        }
//        //5.存在，写入redis缓存
//        stringRedisTemplate.opsForValue().set(RedisConstants.CACHE_SHOP_KEY + id, JSONUtil.toJsonStr(shop),30L, TimeUnit.MINUTES);
//        //6.返回
//        return shop;
//    }
}
