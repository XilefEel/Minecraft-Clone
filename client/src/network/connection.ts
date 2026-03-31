import { decode, encode } from "@msgpack/msgpack";
import { Chunk } from "../world/chunk";
import type { Player } from "../player/player";
import type { World } from "../world/world";
import * as THREE from "three";
import { RemotePlayer } from "../player/remotePlayer";
import { sendChat } from "../ui/chat";
import { receiveServerTime } from "../scene/dayNight";
import type { ChunkManager } from "../world/chunkManager";

export type ServerEvent =
  | { type: "Ready" }
  | { type: "ChunkData"; cx: number; cz: number; blocks: number[] }
  | { type: "PlayerSync"; id: string; username: string }
  | { type: "PlayerJoined"; id: string; username: string }
  | { type: "PlayerLeft"; id: string; username: string }
  | {
      type: "PlayerPosition";
      id: string;
      x: number;
      y: number;
      z: number;
      yaw: number;
    }
  | { type: "BlockUpdate"; x: number; y: number; z: number; block_id: number }
  | { type: "TimeUpdate"; time: number }
  | { type: "ChatMessage"; username: string; message: string };

export type ClientEvent =
  | { type: "Join"; username: string }
  | { type: "Move"; x: number; y: number; z: number; yaw: number }
  | { type: "BlockBreak"; x: number; y: number; z: number }
  | { type: "BlockPlace"; x: number; y: number; z: number; block_id: number }
  | { type: "RequestChunk"; cx: number; cz: number }
  | { type: "ChatMessage"; message: string };

export class Connection {
  chunkManager: ChunkManager;

  private ws: WebSocket;
  private remotePlayersMap = new Map<string, RemotePlayer>();

  private lastSentPosition = new THREE.Vector3();
  private lastSentYaw = 0;

  constructor(
    ip: string,
    username: string,
    player: Player,
    world: World,
    chunkManager: ChunkManager,
    scene: THREE.Scene,
  ) {
    this.chunkManager = chunkManager;
    this.ws = new WebSocket(`ws://${ip}/ws`);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.sendEvent({ type: "Join", username });
    };

    this.ws.onclose = () => console.log("disconnected from server");

    this.ws.onmessage = (e) => {
      const event = decode(new Uint8Array(e.data)) as ServerEvent;
      this.handleEvent(event, world, scene);
    };

    // send player position to server
    setInterval(() => this.sendPosition(player), 50);
  }

  private sendPosition(player: Player) {
    const positionChanged =
      player.position.distanceTo(this.lastSentPosition) > 0.01;
    const yawChanged = Math.abs(player.yaw - this.lastSentYaw) > 0.01;

    if (!positionChanged && !yawChanged) return;

    this.lastSentPosition.copy(player.position);
    this.lastSentYaw = player.yaw;

    this.sendEvent({
      type: "Move",
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      yaw: player.yaw,
    });
  }

  private handleEvent(event: ServerEvent, world: World, scene: THREE.Scene) {
    switch (event.type) {
      // if server is ready, start requesting chunks
      case "Ready":
        this.chunkManager.start();
        break;

      // if received chunk data
      case "ChunkData":
        const chunk = new Chunk(event.cx, event.cz);
        chunk.blocks = new Uint8Array(event.blocks);
        world.addChunk(chunk);
        this.chunkManager.markReceived(event.cx, event.cz);
        break;

      // for syncing existing players when joining
      case "PlayerSync":
        this.remotePlayersMap.set(
          event.id,
          new RemotePlayer(event.id, event.username, scene),
        );
        break;

      // if a new player joined
      case "PlayerJoined":
        this.remotePlayersMap.set(
          event.id,
          new RemotePlayer(event.id, event.username, scene),
        );
        sendChat(`${event.username} joined the game`);
        break;

      // if a player left
      case "PlayerLeft":
        this.remotePlayersMap.get(event.id)?.remove(scene);
        this.remotePlayersMap.delete(event.id);
        sendChat(`${event.username} left the game`);
        break;

      // if a player position changes
      case "PlayerPosition":
        this.remotePlayersMap
          .get(event.id)
          ?.updatePosition(event.x, event.y, event.z, event.yaw);

        break;

      // if a block is updated
      case "BlockUpdate":
        world.setBlock(event.x, event.y, event.z, event.block_id);
        world.remeshAt(event.x, event.z);
        break;

      // sync server time
      case "TimeUpdate":
        receiveServerTime(event.time);
        break;

      // if a chat message is received
      case "ChatMessage":
        sendChat(`${event.username}: ${event.message}`);
        break;
    }
  }

  getRemotePlayerPositions(): {
    position: THREE.Vector3;
    width: number;
    height: number;
  }[] {
    return Array.from(this.remotePlayersMap.values()).map((p) => ({
      position: p.mesh.position,
      width: p.width,
      height: p.height,
    }));
  }

  updateRemotePlayers() {
    this.remotePlayersMap.forEach((p) => p.tick());
  }

  sendEvent(event: ClientEvent) {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(encode(event));
  }
}
