local voucherId = ARGV[1]
local userId = ARGV[2]

local stockKey = 'seckill:stock:' .. voucherId
local orderKey = 'seckill:order:' .. voucherId

redis.call('INCRBY', stockKey, 1)
redis.call('SREM', orderKey, userId)
return 0
