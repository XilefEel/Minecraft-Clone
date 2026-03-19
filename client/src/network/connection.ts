import { decode, encode } from "@msgpack/msgpack";
import { Chunk } from "../world/chunk";
import type { Player } from "../player/player";
import { RemotePlayer } from "../player/remotePlayer";
import * as THREE from "three";

type ServerMessage =
  | { type: "ChunkData"; cx: number; cz: number; blocks: number[] }
  | { type: "PlayerJoined"; id: string }
  | { type: "PlayerLeft"; id: string }
  | { type: "PlayerPosition"; id: string; x: number; y: number; z: number };

type ClientMessage = { type: "Move"; x: number; y: number; z: number };

export function initConnection(
  player: Player,
  scene: THREE.Scene,
  onChunkReceived: (chunk: Chunk) => void,
) {
  const remotePlayerMap = new Map<string, RemotePlayer>();

  const ws = new WebSocket(
    import.meta.env.VITE_WS_URL ?? "ws://localhost:3000/ws",
  );
  ws.binaryType = "arraybuffer";

  ws.onopen = () => console.log("connected to server");
  ws.onclose = () => console.log("disconnected from server");

  ws.onmessage = (e) => {
    const msg = decode(new Uint8Array(e.data)) as ServerMessage;

    if (msg.type === "ChunkData") {
      const chunk = new Chunk(msg.cx, msg.cz);
      chunk.blocks = new Uint8Array(msg.blocks);
      onChunkReceived(chunk);
    } else if (msg.type === "PlayerJoined") {
      console.log("player joined:", msg.id);
      remotePlayerMap.set(msg.id, new RemotePlayer(msg.id, scene));
    } else if (msg.type === "PlayerLeft") {
      console.log("player left:", msg.id);
      remotePlayerMap.get(msg.id)?.remove(scene);
      remotePlayerMap.delete(msg.id);
    } else if (msg.type === "PlayerPosition") {
      console.log("player moved:", msg.id, msg.x, msg.y, msg.z);
      if (!remotePlayerMap.has(msg.id)) {
        remotePlayerMap.set(msg.id, new RemotePlayer(msg.id, scene));
      }
      remotePlayerMap.get(msg.id)?.updatePosition(msg.x, msg.y, msg.z);
    }
  };

  // send position every 50ms
  setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const msg: ClientMessage = {
      type: "Move",
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    };
    ws.send(encode(msg));
  }, 50);

  return ws;
}
