#!/bin/bash
#
# WordOps Dashboard Installer v1.0
#
# Automated installation script for WordOps Dashboard.
# Handles fresh installs and upgrades.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/wpbryant/WordOps-Dashboard/master/install.sh | bash
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
REPO_URL="https://github.com/wpbryant/WordOps-Dashboard.git"

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

# Note: When script is piped from curl, stdin is the script itself.
# We need to read from /dev/tty for interactive prompts.

# Prompt for domain name
prompt_domain() {
    local existing_domain
    existing_domain=$(read_existing_config "WO_DASHBOARD_CORS_ORIGINS" | grep -oP 'https://\K[^"]+' | head -1 || echo "")

    if [[ "$INSTALL_MODE" == "upgrade" && -n "$existing_domain" ]]; then
        read -p "Domain [$existing_domain]: " DOMAIN < /dev/tty
        DOMAIN=${DOMAIN:-$existing_domain}
    else
        while [[ -z "$DOMAIN" ]]; do
            read -p "Enter domain for dashboard (e.g., dashboard.example.com): " DOMAIN < /dev/tty
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
        read -p "Admin username [$existing_user]: " ADMIN_USER < /dev/tty
        ADMIN_USER=${ADMIN_USER:-$existing_user}
    else
        read -p "Admin username [admin]: " ADMIN_USER < /dev/tty
        ADMIN_USER=${ADMIN_USER:-admin}
    fi

    print_info "Admin username: $ADMIN_USER"
}

# Prompt for admin password
prompt_admin_pass() {
    echo ""
    if [[ "$INSTALL_MODE" == "upgrade" ]]; then
        read -p "Update admin password? [y/N]: " update_pass < /dev/tty
        if [[ "$update_pass" != "y" && "$update_pass" != "Y" ]]; then
            KEEP_EXISTING_PASSWORD=true
            print_info "Keeping existing password"
            return
        fi
    fi

    while [[ -z "$ADMIN_PASS" ]]; do
        read -s -p "Admin password: " ADMIN_PASS < /dev/tty
        echo ""
        if [[ -z "$ADMIN_PASS" ]]; then
            print_error "Password is required"
        elif [[ ${#ADMIN_PASS} -lt 8 ]]; then
            print_error "Password must be at least 8 characters"
            ADMIN_PASS=""
        fi
    done

    read -s -p "Confirm password: " ADMIN_PASS_CONFIRM < /dev/tty
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

# Generate password hash using Python (requires venv to be set up first)
generate_password_hash() {
    if [[ "$KEEP_EXISTING_PASSWORD" == "true" ]]; then
        ADMIN_PASSWORD_HASH=$(read_existing_config "WO_DASHBOARD_ADMIN_PASSWORD_HASH")
        print_info "Using existing password hash"
    else
        print_info "Generating password hash..."
        # Escape single quotes in password for Python
        local escaped_pass
        escaped_pass=$(printf '%s' "$ADMIN_PASS" | sed "s/'/\\\\'/g")

        # Use the venv's Python which has passlib installed
        ADMIN_PASSWORD_HASH=$("$APP_DIR/.venv/bin/python3" -c "
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

# Install Node.js 20+ if not present
install_nodejs() {
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        local node_version
        node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 18 ]; then
            print_info "Node.js $(node -v) already installed"
            return 0
        fi
    fi

    print_warning "Node.js 18+ is required but not installed"
    print_info "Installing Node.js 20 LTS from NodeSource..."

    # Detect OS distribution
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        print_error "Cannot detect OS distribution"
        exit 1
    fi

    # Install Node.js 20 LTS from NodeSource
    case "$OS" in
        ubuntu|debian)
            # Download and run NodeSource setup script
            if ! curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; then
                print_error "Failed to download NodeSource setup script"
                exit 1
            fi

            # Install Node.js
            apt-get install -y nodejs
            ;;
        centos|rhel|rocky|almalinux)
            # Download and run NodeSource setup script for RHEL
            if ! curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -; then
                print_error "Failed to download NodeSource setup script"
                exit 1
            fi

            # Install Node.js
            yum install -y nodejs
            ;;
        *)
            print_error "Unsupported OS: $OS"
            print_error "Please install Node.js 18+ manually"
            exit 1
            ;;
    esac

    # Verify installation
    if ! command -v node &> /dev/null; then
        print_error "Node.js installation failed"
        exit 1
    fi

    print_success "Node.js $(node -v) installed"
}

# Build frontend
build_frontend() {
    print_info "Building frontend..."

    local frontend_dir="$APP_DIR/frontend"

    # Install Node.js if needed
    install_nodejs

    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 18 or higher required (found $(node -v))"
        exit 1
    fi
    print_info "Node.js $(node -v) found"

    # Install npm dependencies
    print_info "Installing npm dependencies..."
    cd "$frontend_dir" || exit 1

    # Remove --quiet to see any errors
    if ! npm ci; then
        print_error "Failed to install npm dependencies"
        print_info "Trying with npm install instead..."
        if ! npm install; then
            print_error "Failed to install npm dependencies with npm install"
            exit 1
        fi
    fi

    # Build frontend
    print_info "Building frontend..."
    if ! npm run build; then
        print_error "Frontend build failed"
        print_info "Check that package.json exists and is valid"
        exit 1
    fi

    # Verify build output
    if [[ ! -d "$frontend_dir/dist" ]]; then
        print_error "Frontend build directory not found"
        exit 1
    fi

    print_success "Frontend built successfully"
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

    print_success "Configuration deployed to $config_file"
    print_info "Admin username: $ADMIN_USER"
    if [[ "$KEEP_EXISTING_PASSWORD" == "true" ]]; then
        print_info "Using existing password hash"
    else
        print_info "Using new password hash"
    fi
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

    # Check if site already exists - try to list it
    if wo site info "$DOMAIN" >/dev/null 2>&1; then
        print_info "WordOps site already exists, skipping creation..."
    else
        # Try to create new site with Let's Encrypt SSL
        print_info "Creating WordOps site with SSL..."
        if wo site create "$DOMAIN" --proxy=127.0.0.1:8000 --letsencrypt 2>&1; then
            print_success "WordOps site created with SSL"
        else
            # SSL failed, try without SSL
            print_warning "SSL certificate issuance failed (DNS not configured?)"
            print_info "Creating site without SSL..."
            if wo site create "$DOMAIN" --proxy=127.0.0.1:8000 2>&1; then
                print_warning "Site created without SSL - configure DNS and run: wo site update $DOMAIN --letsencrypt"
            else
                print_warning "Could not create WordOps site (may already exist), continuing anyway..."
            fi
        fi
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
# Uninstallation
# =============================================================================

# Read domain from existing configuration for uninstall
get_installed_domain() {
    if [[ -f "$CONFIG_DIR/config.env" ]]; then
        read_existing_config "WO_DASHBOARD_CORS_ORIGINS" | grep -oP 'https://\K[^"]+' | head -1 || echo ""
    fi
}

# Uninstall function - removes all dashboard components
do_uninstall() {
    print_header
    check_root

    print_warning "This will completely remove WordOps Dashboard"
    echo ""
    echo "The following will be removed:"
    echo "  - Application directory: $APP_DIR"
    echo "  - Configuration: $CONFIG_DIR"
    echo "  - Log files: $LOG_DIR"
    echo "  - Systemd service: wo-dashboard"
    echo "  - Nginx configuration"
    echo ""

    # Get domain for WordOps site deletion
    local domain
    domain=$(get_installed_domain)

    if [[ -n "$domain" ]]; then
        echo "  - WordOps site: $domain"
        echo ""
    fi

    read -p "Are you sure you want to continue? [y/N]: " confirm < /dev/tty
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        print_info "Uninstall cancelled"
        exit 0
    fi

    echo ""

    # Stop and disable service
    if systemctl is-active wo-dashboard --quiet 2>/dev/null; then
        print_info "Stopping service..."
        systemctl stop wo-dashboard
    fi

    if systemctl is-enabled wo-dashboard --quiet 2>/dev/null; then
        print_info "Disabling service..."
        systemctl disable wo-dashboard --quiet
    fi

    # Remove systemd service file
    if [[ -f "/etc/systemd/system/wo-dashboard.service" ]]; then
        print_info "Removing systemd service..."
        rm -f /etc/systemd/system/wo-dashboard.service
        systemctl daemon-reload
    fi

    # Remove nginx configuration
    if [[ -n "$domain" ]]; then
        local nginx_conf="wo-dashboard-$domain.conf"
        if [[ -f "/etc/nginx/sites-available/$nginx_conf" ]]; then
            print_info "Removing nginx configuration..."
            rm -f "/etc/nginx/sites-enabled/$nginx_conf"
            rm -f "/etc/nginx/sites-available/$nginx_conf"
            systemctl reload nginx 2>/dev/null || true
        fi

        # Optionally delete WordOps site
        if wo site list 2>/dev/null | grep -q "^$domain$"; then
            echo ""
            read -p "Also delete WordOps site '$domain'? [y/N]: " delete_site < /dev/tty
            if [[ "$delete_site" == "y" || "$delete_site" == "Y" ]]; then
                print_info "Deleting WordOps site..."
                wo site delete "$domain" --force --no-prompt
            else
                print_info "Keeping WordOps site (you may want to reconfigure it)"
            fi
        fi
    fi

    # Remove application directories
    if [[ -d "$APP_DIR" ]]; then
        print_info "Removing application directory..."
        rm -rf "$APP_DIR"
    fi

    if [[ -d "$CONFIG_DIR" ]]; then
        print_info "Removing configuration..."
        rm -rf "$CONFIG_DIR"
    fi

    if [[ -d "$LOG_DIR" ]]; then
        print_info "Removing log files..."
        rm -rf "$LOG_DIR"
    fi

    if [[ -d "$RUN_DIR" ]]; then
        rm -rf "$RUN_DIR"
    fi

    echo ""
    print_success "WordOps Dashboard has been uninstalled"
    echo ""
}

# =============================================================================
# Help and Usage
# =============================================================================

# Print usage information
show_help() {
    echo "WordOps Dashboard Installer v${VERSION}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h       Show this help message and exit"
    echo "  --uninstall      Remove WordOps Dashboard completely"
    echo "  --version, -v    Show version number and exit"
    echo ""
    echo "Without options, the script performs installation or upgrade."
    echo ""
    echo "Prerequisites:"
    echo "  - Running as root (required for systemctl, wo, nginx)"
    echo "  - WordOps installed and configured"
    echo "  - Python 3.10 or higher"
    echo "  - Ubuntu/Debian system"
    echo ""
    echo "Installation:"
    echo "  The installer will prompt for:"
    echo "  - Domain name for the dashboard"
    echo "  - Admin username (default: admin)"
    echo "  - Admin password"
    echo ""
    echo "  It will then:"
    echo "  - Clone the repository to $APP_DIR"
    echo "  - Create Python virtual environment"
    echo "  - Install dependencies"
    echo "  - Create WordOps site with Let's Encrypt SSL"
    echo "  - Configure nginx reverse proxy"
    echo "  - Set up systemd service"
    echo ""
    echo "Upgrade:"
    echo "  Re-running the installer on an existing installation will:"
    echo "  - Pull latest code from repository"
    echo "  - Update Python dependencies"
    echo "  - Optionally update configuration"
    echo "  - Restart the service"
    echo ""
    echo "Examples:"
    echo "  # Fresh install or upgrade"
    echo "  sudo $0"
    echo ""
    echo "  # Install via curl"
    echo "  curl -sSL https://raw.githubusercontent.com/WordOps/WordOps-Dashboard/master/install.sh | sudo bash"
    echo ""
    echo "  # Uninstall"
    echo "  sudo $0 --uninstall"
    echo ""
}

# Print version
show_version() {
    echo "WordOps Dashboard Installer v${VERSION}"
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

    # Generate secret key (doesn't need Python dependencies)
    generate_secret_key

    # Setup application and Python environment first
    create_directories
    setup_application
    setup_python_env

    # Build frontend
    build_frontend

    # Now generate password hash (needs passlib from venv)
    generate_password_hash

    # Deploy
    deploy_config
    deploy_systemd
    setup_wordops_site

    # Start
    start_service

    # Done
    print_summary
}

# =============================================================================
# Entry Point - Parse command line arguments
# =============================================================================

# Parse arguments and dispatch to appropriate function
main() {
    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --version|-v)
            show_version
            exit 0
            ;;
        --uninstall)
            do_uninstall
            exit 0
            ;;
        "")
            # No arguments - run installation
            do_install
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
