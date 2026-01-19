#!/bin/bash
#
# WordOps Dashboard Installer v1.0
#
# Automated installation script for WordOps Dashboard.
# Handles fresh installs and upgrades.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/WordOps/WordOps-Dashboard/master/install.sh | bash
#   ./install.sh
#   ./install.sh --uninstall
#   ./install.sh --help
#
# Prerequisites:
#   - Running as root (required for systemctl, wo, nginx)
#   - WordOps installed and configured
#   - Ubuntu/Debian system
#
# The script will:
#   - Create Python virtual environment
#   - Install dashboard application
#   - Configure nginx via WordOps
#   - Set up systemd service
#   - Configure environment variables
#

set -e

# =============================================================================
# Constants
# =============================================================================
VERSION="1.0.0"
APP_DIR="/var/www/wo-dashboard"
CONFIG_DIR="/etc/wo-dashboard"
LOG_DIR="/var/log/wo-dashboard"
RUN_DIR="/run/wo-dashboard"
REPO_URL="https://github.com/WordOps/WordOps-Dashboard.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print script header
print_header() {
    echo ""
    echo "============================================"
    echo "  WordOps Dashboard Installer v${VERSION}"
    echo "============================================"
    echo ""
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        echo "  Try: sudo $0"
        exit 1
    fi
}

# Check if WordOps is installed
check_wordops() {
    if ! command -v wo &> /dev/null; then
        print_error "WordOps is not installed"
        echo "  Install WordOps first: https://wordops.net/getting-started/"
        exit 1
    fi
    print_info "WordOps found: $(wo --version 2>/dev/null || echo 'version unknown')"
}

# Check if Python 3.10+ is available
check_python() {
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi

    PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    REQUIRED_VERSION="3.10"

    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Python $REQUIRED_VERSION or higher required (found $PYTHON_VERSION)"
        exit 1
    fi
    print_info "Python $PYTHON_VERSION found"
}

# Detect installation mode
detect_mode() {
    if [[ -d "$APP_DIR" && -f "$CONFIG_DIR/config.env" ]]; then
        INSTALL_MODE="upgrade"
        print_info "Existing installation detected - upgrade mode"
    else
        INSTALL_MODE="fresh"
        print_info "No existing installation - fresh install mode"
    fi
}

# Read existing config value
read_existing_config() {
    local key="$1"
    if [[ -f "$CONFIG_DIR/config.env" ]]; then
        grep "^${key}=" "$CONFIG_DIR/config.env" 2>/dev/null | cut -d'=' -f2- || echo ""
    fi
}

# =============================================================================
# Interactive Prompts
# =============================================================================

# Prompt for domain name
prompt_domain() {
    local existing_domain
    existing_domain=$(read_existing_config "WO_DASHBOARD_CORS_ORIGINS" | grep -oP 'https://\K[^"]+' | head -1 || echo "")

    if [[ "$INSTALL_MODE" == "upgrade" && -n "$existing_domain" ]]; then
        read -p "Domain [$existing_domain]: " DOMAIN
        DOMAIN=${DOMAIN:-$existing_domain}
    else
        while [[ -z "$DOMAIN" ]]; do
            read -p "Enter domain for dashboard (e.g., dashboard.example.com): " DOMAIN
            if [[ -z "$DOMAIN" ]]; then
                print_error "Domain is required"
            fi
        done
    fi

    # Basic domain validation
    if ! [[ "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        print_error "Invalid domain format: $DOMAIN"
        exit 1
    fi

    print_info "Domain: $DOMAIN"
}

# Prompt for admin username
prompt_admin_user() {
    local existing_user
    existing_user=$(read_existing_config "WO_DASHBOARD_ADMIN_USERNAME")

    if [[ "$INSTALL_MODE" == "upgrade" && -n "$existing_user" ]]; then
        read -p "Admin username [$existing_user]: " ADMIN_USER
        ADMIN_USER=${ADMIN_USER:-$existing_user}
    else
        read -p "Admin username [admin]: " ADMIN_USER
        ADMIN_USER=${ADMIN_USER:-admin}
    fi

    print_info "Admin username: $ADMIN_USER"
}

# Prompt for admin password
prompt_admin_pass() {
    echo ""
    if [[ "$INSTALL_MODE" == "upgrade" ]]; then
        read -p "Update admin password? [y/N]: " update_pass
        if [[ "$update_pass" != "y" && "$update_pass" != "Y" ]]; then
            KEEP_EXISTING_PASSWORD=true
            print_info "Keeping existing password"
            return
        fi
    fi

    while [[ -z "$ADMIN_PASS" ]]; do
        read -s -p "Admin password: " ADMIN_PASS
        echo ""
        if [[ -z "$ADMIN_PASS" ]]; then
            print_error "Password is required"
        elif [[ ${#ADMIN_PASS} -lt 8 ]]; then
            print_error "Password must be at least 8 characters"
            ADMIN_PASS=""
        fi
    done

    read -s -p "Confirm password: " ADMIN_PASS_CONFIRM
    echo ""

    if [[ "$ADMIN_PASS" != "$ADMIN_PASS_CONFIRM" ]]; then
        print_error "Passwords do not match"
        exit 1
    fi

    KEEP_EXISTING_PASSWORD=false
    print_success "Password set"
}

# Prompt for all configuration
prompt_config() {
    echo ""
    print_info "Configuration"
    echo "----------------------------------------"

    prompt_domain
    prompt_admin_user
    prompt_admin_pass

    echo ""
}

# =============================================================================
# Credential Generation
# =============================================================================

# Generate random secret key
generate_secret_key() {
    SECRET_KEY=$(openssl rand -hex 32)
    print_info "Generated new secret key"
}

# Generate password hash using Python
generate_password_hash() {
    if [[ "$KEEP_EXISTING_PASSWORD" == "true" ]]; then
        ADMIN_PASSWORD_HASH=$(read_existing_config "WO_DASHBOARD_ADMIN_PASSWORD_HASH")
        print_info "Using existing password hash"
    else
        # Escape single quotes in password for Python
        local escaped_pass
        escaped_pass=$(printf '%s' "$ADMIN_PASS" | sed "s/'/\\\\'/g")

        ADMIN_PASSWORD_HASH=$(python3 -c "
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
print(pwd_context.hash('$escaped_pass'))
")
        print_info "Generated password hash"
    fi
}

# =============================================================================
# Directory Setup
# =============================================================================

# Create required directories
create_directories() {
    print_info "Creating directories..."

    mkdir -p "$APP_DIR"
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$RUN_DIR"

    # Set permissions
    chmod 750 "$CONFIG_DIR"
    chmod 755 "$LOG_DIR"
    chmod 755 "$RUN_DIR"

    print_success "Directories created"
}

# =============================================================================
# Application Setup
# =============================================================================

# Clone or update the application
setup_application() {
    print_info "Setting up application..."

    if [[ "$INSTALL_MODE" == "fresh" ]]; then
        # Fresh install - clone repository
        if [[ -d "$APP_DIR/.git" ]]; then
            print_warning "Git repository already exists, pulling latest..."
            cd "$APP_DIR"
            git fetch origin
            git reset --hard origin/master
        else
            print_info "Cloning repository..."
            rm -rf "$APP_DIR"
            git clone "$REPO_URL" "$APP_DIR"
        fi
    else
        # Upgrade - pull latest changes
        print_info "Updating application..."
        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/master
    fi

    print_success "Application updated"
}

# Set up Python virtual environment
setup_python_env() {
    print_info "Setting up Python environment..."

    # Create venv if not exists
    if [[ ! -d "$APP_DIR/.venv" ]]; then
        print_info "Creating virtual environment..."
        python3 -m venv "$APP_DIR/.venv"
    fi

    # Upgrade pip
    print_info "Upgrading pip..."
    "$APP_DIR/.venv/bin/pip" install --upgrade pip --quiet

    # Install dependencies
    print_info "Installing dependencies..."
    "$APP_DIR/.venv/bin/pip" install -e "$APP_DIR" --quiet

    print_success "Python environment ready"
}

# =============================================================================
# Configuration Deployment
# =============================================================================

# Deploy environment configuration
deploy_config() {
    print_info "Deploying configuration..."

    # Read template and substitute placeholders
    local template="$APP_DIR/deploy/config.env.template"
    local config_file="$CONFIG_DIR/config.env"

    if [[ ! -f "$template" ]]; then
        print_error "Config template not found: $template"
        exit 1
    fi

    # Use existing SECRET_KEY for upgrades if available
    if [[ "$INSTALL_MODE" == "upgrade" ]]; then
        local existing_key
        existing_key=$(read_existing_config "WO_DASHBOARD_SECRET_KEY")
        if [[ -n "$existing_key" ]]; then
            SECRET_KEY="$existing_key"
            print_info "Keeping existing secret key"
        fi
    fi

    # Create config file from template
    sed -e "s|{{SECRET_KEY}}|$SECRET_KEY|g" \
        -e "s|{{DOMAIN}}|$DOMAIN|g" \
        -e "s|{{ADMIN_USERNAME}}|$ADMIN_USER|g" \
        -e "s|{{ADMIN_PASSWORD_HASH}}|$ADMIN_PASSWORD_HASH|g" \
        "$template" > "$config_file"

    # Secure the config file
    chmod 600 "$config_file"

    print_success "Configuration deployed"
}

# Deploy systemd service
deploy_systemd() {
    print_info "Deploying systemd service..."

    local template="$APP_DIR/deploy/wo-dashboard.service"
    local service_file="/etc/systemd/system/wo-dashboard.service"

    if [[ ! -f "$template" ]]; then
        print_error "Service template not found: $template"
        exit 1
    fi

    # Copy service file (no substitution needed)
    cp "$template" "$service_file"

    # Reload systemd
    systemctl daemon-reload

    print_success "Systemd service deployed"
}

# =============================================================================
# WordOps Site Setup
# =============================================================================

# Create or update WordOps site
setup_wordops_site() {
    print_info "Setting up WordOps site..."

    # Check if site already exists
    if wo site list 2>/dev/null | grep -q "^$DOMAIN$"; then
        print_info "WordOps site exists, updating configuration..."
    else
        # Create new site with Let's Encrypt SSL
        print_info "Creating WordOps site with SSL..."
        wo site create "$DOMAIN" --proxy=127.0.0.1:8000 --letsencrypt
        print_success "WordOps site created"
    fi

    # Deploy custom nginx configuration
    deploy_nginx_config
}

# Deploy custom nginx configuration
deploy_nginx_config() {
    print_info "Deploying nginx configuration..."

    local template="$APP_DIR/deploy/nginx.conf.template"
    local nginx_available="/etc/nginx/sites-available"
    local nginx_enabled="/etc/nginx/sites-enabled"
    local nginx_conf="wo-dashboard-$DOMAIN.conf"

    if [[ ! -f "$template" ]]; then
        print_error "Nginx template not found: $template"
        exit 1
    fi

    # Substitute placeholders
    sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
        "$template" > "$nginx_available/$nginx_conf"

    # Enable site if not already enabled
    if [[ ! -L "$nginx_enabled/$nginx_conf" ]]; then
        ln -sf "$nginx_available/$nginx_conf" "$nginx_enabled/$nginx_conf"
    fi

    # Test nginx configuration
    if ! nginx -t 2>/dev/null; then
        print_error "Nginx configuration test failed"
        print_warning "Check: $nginx_available/$nginx_conf"
        exit 1
    fi

    # Reload nginx
    systemctl reload nginx

    print_success "Nginx configuration deployed"
}

# =============================================================================
# Service Management
# =============================================================================

# Enable and start the service
start_service() {
    print_info "Starting WordOps Dashboard service..."

    # Enable service
    systemctl enable wo-dashboard --quiet

    # Restart service
    systemctl restart wo-dashboard

    # Wait for service to start
    sleep 2

    # Check status
    if systemctl is-active wo-dashboard --quiet; then
        print_success "Service started successfully"
    else
        print_error "Service failed to start"
        echo ""
        echo "Check logs with: journalctl -u wo-dashboard -n 50"
        echo "Or: tail -f $LOG_DIR/error.log"
        exit 1
    fi
}

# =============================================================================
# Installation Summary
# =============================================================================

# Print success message
print_summary() {
    echo ""
    echo "============================================"
    echo "  Installation Complete!"
    echo "============================================"
    echo ""
    print_success "WordOps Dashboard is now running"
    echo ""
    echo "  Dashboard URL: https://$DOMAIN"
    echo "  Admin User:    $ADMIN_USER"
    echo ""
    echo "  Log files:     $LOG_DIR/"
    echo "  Config file:   $CONFIG_DIR/config.env"
    echo ""
    echo "  Service commands:"
    echo "    systemctl status wo-dashboard"
    echo "    systemctl restart wo-dashboard"
    echo "    systemctl stop wo-dashboard"
    echo ""
    if [[ "$INSTALL_MODE" == "fresh" ]]; then
        echo "  To uninstall:"
        echo "    $0 --uninstall"
        echo ""
    fi
}

# =============================================================================
# Main Installation Flow
# =============================================================================

# Main installation function
do_install() {
    print_header

    # Pre-flight checks
    check_root
    check_wordops
    check_python
    detect_mode

    # Get configuration
    prompt_config

    # Generate credentials
    generate_secret_key
    generate_password_hash

    # Setup
    create_directories
    setup_application
    setup_python_env

    # Deploy
    deploy_config
    deploy_systemd
    setup_wordops_site

    # Start
    start_service

    # Done
    print_summary
}

# Run installation
do_install
