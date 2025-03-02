# Building Vector from Source

This document provides instructions for setting up and building the Vector file manager from source code.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or later)
- **Rust** (latest stable version)
- **pnpm** (v10 or later)
- Platform-specific dependencies for Tauri (see below)

### Platform-Specific Dependencies

#### Windows

- [Visual Studio 2019 or later](https://visualstudio.microsoft.com/) with the "Desktop development with C++" workload
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

#### macOS

- Xcode Command Line Tools
  ```
  xcode-select --install
  ```
- [macOS Development Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites/#setting-up-macos)

#### Linux

For Debian/Ubuntu:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

For other distributions, see the [Tauri prerequisites guide](https://tauri.app/v1/guides/getting-started/prerequisites/#setting-up-linux).

## Clone the Repository

```bash
git clone https://github.com/cae-labs/vector.git
cd vector
```

## Install Dependencies

```bash
pnpm install
```

## Development Build

To start the app in development mode:

```bash
pnpm tauri dev
```

This will start the development server and launch the Tauri application with hot reloading for the frontend.

## Production Build

To create a production build:

```bash
pnpm tauri build
```

This will create platform-specific installers in the `src-tauri/target/release/bundle` directory.

## Project Structure

- `/src`: Frontend React/TypeScript code
  - `/components`: React components
  - `/hooks`: Custom React hooks
  - `/assets`: Static assets and styles
- `/src-tauri`: Rust backend code
  - `/src`: Rust source files
  - `/capabilities`: Tauri capability configuration
  - `/icons`: Application icons

## Configuration

### Tauri Configuration

Tauri configuration is located in `src-tauri/tauri.conf.json`. You can modify this file to change application metadata, permissions, and other settings.

### Frontend Configuration

- `vite.config.ts`: Vite bundler configuration
- `tsconfig.json`: TypeScript configuration

## Common Issues

### WebView2 Not Found (Windows)

If you encounter an error related to WebView2 not being found on Windows, install the WebView2 runtime from [Microsoft's website](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### Build Fails on macOS

If the build fails on macOS, ensure you have the latest Xcode Command Line Tools installed:

```bash
xcode-select --install
```

### Linux Build Issues

If you encounter build issues on Linux, make sure you have all the required dependencies installed for your distribution. The exact packages may vary depending on your Linux distribution.

## Creating a Release

To create a release:

1. Update the version number in `src-tauri/Cargo.toml` and `package.json`
2. Run `pnpm tauri build`
3. The installers will be available in `src-tauri/target/release/bundle`
