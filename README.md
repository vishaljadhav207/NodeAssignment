# Node.js API with Rate Limiting

## Description
A Node.js API that:
- Implements **rate limiting**: 1 task/second and 20 tasks/minute per user.
- Queues excess tasks for later processing.
- Logs task completion in `task.log`.

---

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   
2. ##Run Redis using Docker:
   ```docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest
   
3. ##Start the Application:
   ```node server.js