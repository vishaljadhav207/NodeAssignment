const express = require('express');
const bodyParser = require('body-parser');
const Redis = require('ioredis');
const Bull = require('bull');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// initialize redis and bull queue
const redisClient = new Redis({
    host: 'localhost', 
    port: 6379,        
});
const taskQueue = new Bull('tasks', { redis: { port: 6379, host: '127.0.0.1' } });

// Rate limiting constants
const TASK_PER_SECOND = 1;
const TASK_PER_MINUTE = 20;

// Task 
async function task(user_id) {
    console.log(`${user_id} - task completed at - ${Date.now()}`);
    const logData = `${user_id} - task completed at - ${new Date().toISOString()}\n`;

    //append to log file
    fs.appendFileSync(path.join(__dirname, 'task.log'), logData);
}

// rate limit middleware
app.post('/api/v1/task', async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    const now = Math.floor(Date.now() / 1000); // Current timestamp (seconds)
    const secondKey = `rate:${user_id}:second:${now}`;
    const minuteKey = `rate:${user_id}:minute:${Math.floor(now / 60)}`;

    try {
        const [currentSecondCount, currentMinuteCount] = await redisClient.mget(secondKey, minuteKey);

        // Check limits
        if (parseInt(currentMinuteCount || '0') >= TASK_PER_MINUTE) {
            await taskQueue.add({ user_id });
            return res.status(429).json({ message: 'Rate limit exceeded. Task queued.' });
        }

        if (parseInt(currentSecondCount || '0') >= TASK_PER_SECOND) {
            await taskQueue.add({ user_id });
            return res.status(429).json({ message: 'Rate limit exceeded. Task queued.' });
        }

        // update limits in Redis
        await redisClient.multi()
            .incr(secondKey).expire(secondKey, 1) // 1 second TTL
            .incr(minuteKey).expire(minuteKey, 60) // 1 minute TTL
            .exec();

        // process task immediately
        await task(user_id);
        res.json({ message: 'Task completed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// process queued tasks
taskQueue.process(async (job) => {
    const { user_id } = job.data;
    await task(user_id);
});

module.exports = app;
