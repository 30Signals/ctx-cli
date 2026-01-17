#!/usr/bin/env bash
set -euo pipefail

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js and its version
if ! command_exists node; then
    echo "Error: Node.js is not installed. Please install Node.js version 18 or higher."
    exit 1
fi

NODE_VERSION=$(node -v)
NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    echo "Error: Node.js version 18 or higher is required. You have version $NODE_VERSION."
    exit 1
fi

# Check for Git
if ! command_exists git; then
    echo "Error: Git is not installed. Please install Git to proceed."
    exit 1
fi

# Configuration
VERSION="v0.2.2"
REPO="30signals/ctx-cli"
INSTALL_DIR=$(mktemp -d)

# Clone the repository
echo "Cloning repository..."
git clone --quiet --depth 1 --branch "$VERSION" "https://github.com/$REPO.git" "$INSTALL_DIR" 2>/dev/null

# Install and build
echo "Installing dependencies and building..."
cd "$INSTALL_DIR"
npm install --silent
npm run build --silent
chmod +x dist/index.js

# Use npm pack to create a tarball, then install from it
# This ensures files are copied instead of symlinked to the temp directory
npm pack --silent
TARBALL=$(ls -1 *.tgz | head -1)
npm install -g "./$TARBALL" --silent

# Clean up
echo "Cleaning up..."
rm -rf "$INSTALL_DIR"

echo "ctx-cli has been installed successfully!"
echo "Run 'ctx --help' to get started."
