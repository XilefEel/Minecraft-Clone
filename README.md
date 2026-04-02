# Minecraft Clone

A browser-based Minecraft clone built with **Three.js** on the client and a **Rust WebSocket server** for real-time multiplayer.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Client | TypeScript + Three.js |
| Server | Rust (WebSocket) |
| Runtime | Bun + Vite |

## Features

- 🌍 3D voxel-style world rendering
- 🧱 Block breaking & placing
- ⚔️ PvP & health system
- 💬 In-game chat and player nametags
- 💾 World persistence and loading
- ⚡ Real-time multiplayer via WebSockets

> 🚧 More features in development

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- [Rust toolchain](https://rustup.rs) (stable) + `cargo`

### 1. Start the Server

```bash
cd server
cargo run -- <COMMAND>
```

#### Commands

| Command | Description |
|---------|-------------|
| `list` | List all saved worlds |
| `create <world> <seed>` | Create a new world with a name and seed and start the server |
| `load <world>` | Load an existing world and start the server |
| `rename <old> <new>` | Rename an existing world |
| `delete <world>` | Delete a world and its chunk data |

#### Examples

```bash
# Create a new world and start the server
cargo run -- create my_world 12345

# List all worlds
cargo run -- list

# Load a world and start the server
cargo run -- load my_world

# Rename a world
cargo run -- rename my_world new_name

# Delete a world
cargo run -- delete my_world
```

### 2. Start the Client

```bash
cd client
bun install
bun run dev -- --host
```

---

## How to Play

### As the Host
1. Start the server (`cargo run -- load <world>`)
2. Start the client with `bun run dev -- --host`
3. Open `localhost:5173` in your browser
4. Enter your **username** (4–32 characters)
5. Enter `localhost:3000` as the server address (or omit it)
6. Click **Play**!

> 💡 **Share your IP with other players:** On Linux/macOS run `ip a` or `ifconfig`, on Windows run `ipconfig`. Look for your IPv4 Address and share it.

### As a Player (same network)
1. Open `<host-ip>:5173` in your browser
2. Enter your **username** and `<host-ip>:3000` as the server address
3. Click **Play**!

> ⚠️ Multiplayer only works on the same local network (LAN). Remote/internet play is not supported.
