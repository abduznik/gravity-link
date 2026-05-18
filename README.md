# Gravity Link (Standalone Bridge)

A beautiful, ultra-premium mobile companion for Antigravity. It mirrors your active desktop IDE chat sessions directly to your mobile phone or browser—allowing you to read streaming replies, send messages, dictate using voice, and stop active generations from anywhere on your local network or Tailscale VPN.

---

## Features

- **Live Chat Mirror**: View the active Antigravity chat panel DOM beautifully mirrored in real-time.
- **Ultra-Premium UI**: Translucent glassmorphic dark theme built using Outfit typography and rich responsive micro-interactions.
- **Local Control Chips**: Switch active windows, select model options, and monitor status.
- **Safe Stop Button**: Dedicated red stop trigger at the bottom right that cancels active runs safely without interrupting casual screen taps.
- **LAN & Tailscale Friendly**: Binds directly to Tailscale adapters and runs purely over standard unencrypted HTTP to bypass self-signed SSL mobile blocks instantly.

---

## Setup & Prerequisites

1. **Enable Remote Debugging in Antigravity**:
   Launch your desktop Antigravity IDE with the remote debugging flag enabled so the local bridge can discover it.
   
   **macOS Command**:
   ```bash
   open -a Antigravity --args --remote-debugging-port=9000
   ```

2. **Download or Compile Standalone Binaries** (see below).

---

## Quick Start (How to Run)

Run the native compiled binary on your preferred port and advertise your local IP (e.g. Tailscale):

```bash
# Run Apple Silicon binary on port 3002 and Tailscale IP
./out/gravity-link-macos-apple-silicon --port 3002 --host <YOUR_IP>
```

### Options

| Flag | Description | Default |
| --- | --- | --- |
| `--port` | The port the companion server listens on | `3000` |
| `--host` | Specific IP address to bind to (e.g., Tailscale IP) | `0.0.0.0` |

Once started, open your mobile browser or scan the QR code to navigate to:
👉 `http://<YOUR_IP>:3002/`

---

## How to Compile / Build from Source

To bundle the UI code and package the whole project into self-contained multi-platform standalone binaries:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Bundle the frontend & standalone scripts**:
   ```bash
   npm run bundle
   ```

3. **Pack into native multi-platform binaries**:
   Use the `pkg` tool to compile the standalone binary (the compiled executables package the HTML and asset files internally in `/snapshot` assets automatically):
   ```bash
   npx pkg . --targets node18-macos-x64,node18-macos-arm64,node18-linux-x64,node18-win-x64 --out-path out/
   ```

Outputs will be saved in `out/` as:
- `gravity-link-macos-apple-silicon` (Apple Silicon macOS)
- `gravity-link-macos-intel` (Intel macOS)
- `gravity-link-linux-x64` (Linux x64)
- `gravity-link-windows.exe` (Windows x64)

---

## License

This project is licensed under the [MIT License](LICENSE).
