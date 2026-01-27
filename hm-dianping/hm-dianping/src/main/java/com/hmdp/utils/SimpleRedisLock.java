package com.hmdp.utils;

import cn.hutool.core.lang.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

import javax.annotation.Resource;
import java.util.Collections;
import java.util.concurrent.TimeUnit;

public class SimpleRedisLock implements ILock {

    private StringRedisTemplate stringRedisTemplate;

    public SimpleRedisLock(String name,StringRedisTemplate stringRedisTemplate) {
        this.name=name;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    private String name;
    private static final DefaultRedisScript<Long> UNLOCK_SCRIPT;
    static {
        UNLOCK_SCRIPT = new DefaultRedisScript<>();
        UNLOCK_SCRIPT.setLocation(new org.springframework.core.io.ClassPathResource("unlock.lua"));
        UNLOCK_SCRIPT.setResultType(Long.class);
    }

    private static final String KRY_PREFIX = "lock:";
    private static final String ID_PREFIX = UUID.randomUUID().toString(true)+"-";
    @Override
    public boolean tryLock(long timeoutSec) {
        //获取线程Id
        String threadId = ID_PREFIX+Thread.currentThread().getId();

        //获取锁
        Boolean success = stringRedisTemplate.opsForValue().setIfAbsent(KRY_PREFIX+name,threadId, timeoutSec, TimeUnit.SECONDS);
        return Boolean.TRUE.equals(success);//自动拆箱
    }

    @Override
    public void unlock() {
    //调用lua脚本
    stringRedisTemplate.execute(UNLOCK_SCRIPT, Collections.singletonList(KRY_PREFIX+name), ID_PREFIX+Thread.currentThread().getId());
    }
/*    @Override
    public void unlock() {
        //获取线程Id
        String threadId = ID_PREFIX+Thread.currentThread().getId();
        //获取锁中的Id
        String id = stringRedisTemplate.opsForValue().get(KRY_PREFIX + name);
        //判断是否是自己的锁
        if(threadId.equals(id)){
            //是自己的锁，释放锁
            stringRedisTemplate.delete(KRY_PREFIX+name);
        }
    }*/
}
