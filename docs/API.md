# WordOps Dashboard API Reference

Base URL: `https://dashboard.yourdomain.com/api/v1`

## Authentication

All endpoints except `/auth/login` and `/health` require a valid JWT token.

### Login

```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded
```

**Request:**

```bash
curl -X POST https://dashboard.yourdomain.com/api/v1/auth/login \
  -d "username=admin&password=yourpassword"
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Using the Token

Include the token in the `Authorization` header for all subsequent requests:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  https://dashboard.yourdomain.com/api/v1/sites
```

Token expires after 60 minutes (configurable via `WO_DASHBOARD_ACCESS_TOKEN_EXPIRE_MINUTES`).

---

## Sites

### List Sites

```http
GET /sites
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by site type: `wordpress`, `php`, `html`, `proxy`, `mysql` |
| `ssl` | boolean | Filter by SSL status: `true` or `false` |
| `search` | string | Search in domain names |

**Example:**

```bash
# List all WordPress sites with SSL
curl -H "Authorization: Bearer $TOKEN" \
  "https://dashboard.yourdomain.com/api/v1/sites?type=wordpress&ssl=true"
```

**Response:**

```json
[
  {
    "name": "example.com",
    "type": "wordpress",
    "ssl": true,
    "cache": "wpredis",
    "php_version": "8.2"
  },
  {
    "name": "blog.example.com",
    "type": "wordpress",
    "ssl": true,
    "cache": "wpfc",
    "php_version": "8.1"
  }
]
```

### Get Site Details

```http
GET /sites/{domain}
```

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://dashboard.yourdomain.com/api/v1/sites/example.com
```

**Response:**

```json
{
  "name": "example.com",
  "type": "wordpress",
  "ssl": true,
  "cache": "wpredis",
  "php_version": "8.2"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid domain format
- `404 Not Found` - Site does not exist

### Create Site

```http
POST /sites
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `domain` | string | Yes | - | Domain name for the site |
| `type` | string | No | `wordpress` | Site type: `wordpress`, `php`, `html`, `proxy` |
| `ssl` | boolean | No | `true` | Enable Let's Encrypt SSL |
| `cache` | string | No | `null` | Cache type: `wpfc`, `wpsc`, `wpredis`, `redis` |
| `php_version` | string | No | `null` | PHP version: `7.4`, `8.0`, `8.1`, `8.2`, `8.3` |

**Example:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "newsite.example.com",
    "type": "wordpress",
    "ssl": true,
    "cache": "wpredis",
    "php_version": "8.2"
  }' \
  https://dashboard.yourdomain.com/api/v1/sites
```

**Response:**

```json
{
  "name": "newsite.example.com",
  "type": "wordpress",
  "ssl": true,
  "cache": "wpredis",
  "php_version": "8.2"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid domain format or validation error
- `503 Service Unavailable` - WordOps CLI error

### Update Site

```http
PUT /sites/{domain}
Content-Type: application/json
```

**Request Body:**

All fields are optional. Only provided fields will be updated.

| Field | Type | Description |
|-------|------|-------------|
| `ssl` | boolean | Enable/disable SSL |
| `cache` | string | Change cache type |
| `php_version` | string | Change PHP version |

**Example:**

```bash
# Enable Redis cache on existing site
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cache": "wpredis"}' \
  https://dashboard.yourdomain.com/api/v1/sites/example.com
```

**Response:**

```json
{
  "name": "example.com",
  "type": "wordpress",
  "ssl": true,
  "cache": "wpredis",
  "php_version": "8.2"
}
```

### Delete Site

```http
DELETE /sites/{domain}?confirm=true
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `confirm` | boolean | Yes | Must be `true` to confirm deletion |

**Example:**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://dashboard.yourdomain.com/api/v1/sites/oldsite.example.com?confirm=true"
```

**Response:**

```json
{
  "message": "Site oldsite.example.com deleted successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Missing `confirm=true` parameter or invalid domain

---

## Server Monitoring

### Get System Metrics

```http
GET /server/metrics
```

Returns CPU, RAM, disk, and network metrics with historical data points for sparklines.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `5m` | Time range: `5m`, `1h`, `24h` |

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://dashboard.yourdomain.com/api/v1/server/metrics?range=1h"
```

**Response:**

```json
{
  "cpu": {
    "name": "CPU Usage",
    "current": 23.5,
    "unit": "%",
    "points": [
      {"timestamp": 1705680000, "value": 21.2},
      {"timestamp": 1705680060, "value": 24.8},
      {"timestamp": 1705680120, "value": 23.5}
    ]
  },
  "ram": {
    "name": "Memory Usage",
    "current": 67.2,
    "unit": "%",
    "points": [...]
  },
  "disk": {
    "name": "Disk Usage",
    "current": 45.0,
    "unit": "%",
    "points": [...]
  },
  "network_in": {
    "name": "Network In",
    "current": 1024.5,
    "unit": "KB/s",
    "points": [...]
  },
  "network_out": {
    "name": "Network Out",
    "current": 512.3,
    "unit": "KB/s",
    "points": [...]
  }
}
```

### List Services

```http
GET /server/services
```

Returns status of system services managed by WordOps.

**Supported Services:**

- `nginx`
- `mariadb` / `mysql`
- `redis-server`
- `php7.4-fpm`, `php8.0-fpm`, `php8.1-fpm`, `php8.2-fpm`, `php8.3-fpm`

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://dashboard.yourdomain.com/api/v1/server/services
```

**Response:**

```json
[
  {
    "name": "nginx",
    "active": true,
    "sub_state": "running",
    "memory_bytes": 52428800,
    "uptime_seconds": 86400,
    "main_pid": 1234
  },
  {
    "name": "php8.2-fpm",
    "active": true,
    "sub_state": "running",
    "memory_bytes": 104857600,
    "uptime_seconds": 86400,
    "main_pid": 5678
  },
  {
    "name": "mariadb",
    "active": true,
    "sub_state": "running",
    "memory_bytes": 209715200,
    "uptime_seconds": 172800,
    "main_pid": 9012
  }
]
```

### Restart Service

```http
POST /server/services/{name}/restart
```

Restarts a system service. Requires sudo privileges configured for the dashboard user.

**Example:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://dashboard.yourdomain.com/api/v1/server/services/nginx/restart
```

**Response:**

```json
{
  "message": "Service nginx restarted successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Service name not in allowlist
- `503 Service Unavailable` - Restart failed

---

## Log Streaming

### WebSocket Log Stream

```
WS /server/logs/{type}/ws?token={jwt_token}
```

Streams log file contents in real-time via WebSocket.

**Log Types:**

| Type | Log File |
|------|----------|
| `nginx-access` | `/var/log/nginx/access.log` |
| `nginx-error` | `/var/log/nginx/error.log` |
| `php-fpm` | `/var/log/php/8.2/fpm.log` |
| `mysql` | `/var/log/mysql/error.log` |

**Authentication:**

WebSocket connections require the JWT token as a query parameter (headers don't work reliably with WebSocket).

**Example (JavaScript):**

```javascript
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const ws = new WebSocket(
  `wss://dashboard.yourdomain.com/api/v1/server/logs/nginx-access/ws?token=${token}`
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.line);
};

ws.onclose = (event) => {
  console.log('Connection closed:', event.reason);
};
```

**Message Format:**

```json
{
  "type": "log",
  "line": "192.168.1.1 - - [19/Jan/2026:10:15:30 +0000] \"GET / HTTP/1.1\" 200 1234"
}
```

**Error Messages:**

```json
{
  "type": "error",
  "message": "Invalid log type"
}
```

---

## Health Check

### Health Endpoint

```http
GET /health
```

No authentication required.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

Also available at `/api/v1/health` for consistency.

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**HTTP Status Codes:**

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid input or validation error |
| `401` | Unauthorized - Missing or invalid token |
| `403` | Forbidden - Token valid but insufficient permissions |
| `404` | Not Found - Resource does not exist |
| `422` | Unprocessable Entity - Request body validation failed |
| `503` | Service Unavailable - Backend service (WordOps CLI, Netdata) error |

---

## Rate Limiting

The login endpoint is rate-limited to 10 requests per minute per IP address. Other endpoints are not rate-limited.

When rate limited, you'll receive:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```
