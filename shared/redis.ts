import Redis from "ioredis";

const redis = new Redis({
    host: process.env.REDIS_HOST as string,
    port: process.env.REDIS_PORT as any,
    password: process.env.REDIS_PASSWORD as string,
    db: process.env.REDIS_DB as any,
});

export default redis;