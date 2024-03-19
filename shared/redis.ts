import Redis from "ioredis";

const REDIS = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(REDIS);

// redis on connect
redis.on("connect", () => {
    console.log("Redis connected");
});

// redis on disconnect
redis.on("disconnect", () => {
    console.log("Redis disconnected");
});

export default redis;