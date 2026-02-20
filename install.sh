#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
fatal()   { error "$@"; exit 1; }

# Configuration
VERSION="v0.2.3"
REPO="30signals/ctx-cli"
INSTALL_DIR=""

# Cleanup trap — runs on exit, error, or interrupt
cleanup() {
    if [ -n "$INSTALL_DIR" ] && [ -d "$INSTALL_DIR" ]; then
        info "Cleaning up temporary directory..."
        rm -rf "$INSTALL_DIR"
    fi
}
trap cleanup EXIT

# ─── Preflight checks ───────────────────────────────────────────────

# Check for required commands
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

info "Running preflight checks..."

if ! command_exists node; then
    fatal "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
fi

NODE_VERSION=$(node -v)
NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    fatal "Node.js 18+ is required. You have $NODE_VERSION."
fi
success "Node.js $NODE_VERSION"

if ! command_exists npm; then
    fatal "npm is not installed. It usually comes with Node.js."
fi
success "npm $(npm -v)"

if ! command_exists git; then
    fatal "Git is not installed. Please install Git to proceed."
fi
success "Git $(git --version | awk '{print $3}')"

# Check if we can write to npm global prefix
NPM_PREFIX=$(npm config get prefix)
if [ ! -w "$NPM_PREFIX/lib" ] 2>/dev/null || [ ! -w "$NPM_PREFIX/bin" ] 2>/dev/null; then
    if ! command_exists sudo; then
        fatal "Cannot write to npm global directory ($NPM_PREFIX). Run as root or configure npm prefix."
    fi
    USE_SUDO="sudo"
    warn "Global npm install requires sudo — you may be prompted for your password."
else
    USE_SUDO=""
fi

# ─── Clone ───────────────────────────────────────────────────────────

INSTALL_DIR=$(mktemp -d)
info "Cloning $REPO@$VERSION into temp directory..."

if ! git clone --depth 1 --branch "$VERSION" "https://github.com/$REPO.git" "$INSTALL_DIR" 2>&1; then
    fatal "Failed to clone repository. Check that the repo and tag '$VERSION' exist."
fi
success "Repository cloned."

# ─── Build ───────────────────────────────────────────────────────────

cd "$INSTALL_DIR"

info "Installing dependencies..."
if ! npm install 2>&1; then
    fatal "npm install failed. See output above for details."
fi
success "Dependencies installed."

info "Building project..."
if ! npm run build 2>&1; then
    fatal "Build failed. See output above for details."
fi
success "Build completed."

# Make the entry point executable
chmod +x dist/index.js

# ─── Install globally ───────────────────────────────────────────────

info "Packing tarball..."
if ! npm pack 2>&1; then
    fatal "npm pack failed. See output above for details."
fi

TARBALL=$(ls -1 *.tgz 2>/dev/null | head -1)
if [ -z "$TARBALL" ]; then
    fatal "No .tgz tarball found after npm pack."
fi
success "Created $TARBALL"

info "Installing globally..."
if ! $USE_SUDO npm install -g "./$TARBALL" 2>&1; then
    fatal "Global install failed. See output above for details."
fi
success "ctx-cli installed globally."

# ─── Verify ──────────────────────────────────────────────────────────

echo ""
if command_exists ctx; then
    success "Installation complete! ctx is available at: $(which ctx)"
    echo ""
    info "Run 'ctx --help' to get started."
else
    warn "Installation finished but 'ctx' was not found on PATH."
    warn "You may need to add $(npm config get prefix)/bin to your PATH."
    echo ""
    echo "  export PATH=\"\$PATH:$(npm config get prefix)/bin\""
    echo ""
fi
