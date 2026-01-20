# WordOps Dashboard

A modern web-based API for managing WordOps servers. Create, configure, and delete WordPress and non-WordPress sites without touching the command line.

## Features

- **Site Management** - Full CRUD API for WordPress, PHP, HTML, and Proxy sites
- **Server Monitoring** - CPU, RAM, disk, and network metrics via Netdata integration
- **Service Control** - View status and restart nginx, PHP-FPM, MariaDB, Redis
- **Log Streaming** - Real-time WebSocket log viewer for access, error, and PHP-FPM logs
- **Secure Authentication** - JWT-based auth with bcrypt password hashing
- **Production Ready** - Nginx reverse proxy, systemd service, one-command installer

## Requirements

- Ubuntu 20.04+ or Debian 11+
- [WordOps](https://wordops.net) installed and configured
- Python 3.10+
- Netdata (optional, for server metrics)

## Quick Install

```bash
curl -sSL https://raw.githubusercontent.com/wpbryant/WordOps-Dashboard/master/install.sh | sudo bash
```

The installer will:
1. Create a Python virtual environment
2. Install the dashboard application
3. Configure nginx via WordOps (with Let's Encrypt SSL)
4. Set up the systemd service
5. Prompt for domain, username, and password

## Manual Installation

### 1. Clone the repository

```bash
git clone https://github.com/wpbryant/WordOps-Dashboard.git /var/www/wo-dashboard
cd /var/www/wo-dashboard
```

### 2. Create virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

### 3. Configure environment

```bash
mkdir -p /etc/wo-dashboard
cp deploy/config.env.template /etc/wo-dashboard/config.env

# Generate secret key
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# Generate password hash
PASSWORD_HASH=$(python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('your-password'))")

# Edit config.env with your values
nano /etc/wo-dashboard/config.env
```

### 4. Create WordOps site

```bash
wo site create dashboard.yourdomain.com --proxy=127.0.0.1:8000 --letsencrypt
```

### 5. Install nginx config

```bash
cp deploy/nginx.conf.template /etc/nginx/sites-available/dashboard.yourdomain.com

# Replace placeholders
sed -i 's/{{DOMAIN}}/dashboard.yourdomain.com/g' /etc/nginx/sites-available/dashboard.yourdomain.com

nginx -t && systemctl reload nginx
```

### 6. Install systemd service

```bash
cp deploy/wo-dashboard.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable wo-dashboard
systemctl start wo-dashboard
```

## Configuration

Environment variables (set in `/etc/wo-dashboard/config.env`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WO_DASHBOARD_SECRET_KEY` | Yes | - | Secret key for JWT signing |
| `WO_DASHBOARD_ADMIN_USERNAME` | Yes | - | Admin login username |
| `WO_DASHBOARD_ADMIN_PASSWORD_HASH` | Yes | - | Bcrypt hash of admin password |
| `WO_DASHBOARD_DEBUG` | No | `false` | Enable debug mode |
| `WO_DASHBOARD_CORS_ORIGINS` | No | `["*"]` | Allowed CORS origins |
| `WO_DASHBOARD_ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | JWT token expiration |
| `WO_DASHBOARD_NETDATA_URL` | No | `http://127.0.0.1:19999` | Netdata API URL |

## API Documentation

Once running, access the interactive API docs at:

- **Swagger UI**: `https://dashboard.yourdomain.com/docs`
- **ReDoc**: `https://dashboard.yourdomain.com/redoc`

### Authentication

```bash
# Get access token
curl -X POST https://dashboard.yourdomain.com/api/v1/auth/login \
  -d "username=admin&password=yourpassword"

# Use token in requests
curl -H "Authorization: Bearer <token>" \
  https://dashboard.yourdomain.com/api/v1/sites
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Get JWT access token |
| `GET` | `/api/v1/sites` | List all sites (supports `?type=`, `?ssl=`, `?search=`) |
| `GET` | `/api/v1/sites/{domain}` | Get site details |
| `POST` | `/api/v1/sites` | Create new site |
| `PUT` | `/api/v1/sites/{domain}` | Update site (SSL, cache, PHP) |
| `DELETE` | `/api/v1/sites/{domain}?confirm=true` | Delete site |
| `GET` | `/api/v1/server/metrics` | Get server metrics (CPU, RAM, disk, network) |
| `GET` | `/api/v1/server/services` | List service statuses |
| `POST` | `/api/v1/server/services/{name}/restart` | Restart a service |
| `WS` | `/api/v1/server/logs/{type}/ws?token=<jwt>` | Stream logs in real-time |

## Upgrading

```bash
cd /var/www/wo-dashboard
git pull
source .venv/bin/activate
pip install -e .
systemctl restart wo-dashboard
```

Or use the installer with `--upgrade` flag:

```bash
curl -sSL https://raw.githubusercontent.com/wpbryant/WordOps-Dashboard/master/install.sh | sudo bash
```

The installer automatically detects existing installations and preserves your configuration.

## Uninstalling

```bash
curl -sSL https://raw.githubusercontent.com/wpbryant/WordOps-Dashboard/master/install.sh | sudo bash -s -- --uninstall
```

Or manually:

```bash
systemctl stop wo-dashboard
systemctl disable wo-dashboard
rm /etc/systemd/system/wo-dashboard.service
rm -rf /var/www/wo-dashboard
rm -rf /etc/wo-dashboard
wo site delete dashboard.yourdomain.com
```

## Development

```bash
# Clone and setup
git clone https://github.com/wpbryant/WordOps-Dashboard.git
cd WordOps-Dashboard
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Run development server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest
```

## Security

- All endpoints (except login and health) require JWT authentication
- Passwords are hashed with bcrypt
- Domain names are validated to prevent command injection
- Log paths are hardcoded to prevent path traversal
- Service names are allowlisted for systemctl operations
- Rate limiting on login endpoint (10 requests/minute)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Built for [WordOps](https://wordops.net) - the modern WordPress stack.
