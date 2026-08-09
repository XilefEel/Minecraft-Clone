import { decode, encode } from "@msgpack/msgpack";
import { Chunk } from "../world/chunk";
import type { Player } from "../player/player";
import type { World } from "../world/world";
import * as THREE from "three";
import { RemotePlayer } from "../player/remotePlayer";
import { sendChat } from "../ui/chat";
import { receiveServerTime } from "../scene/dayNight";
import type { ChunkManager } from "../world/chunkManager";
import { CONFIG } from "../config";
import { decodeRle } from "./rle";

export type ServerEvent =
  | { type: "Ready"; id: string }
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
  | { type: "ChatMessage"; username: string; message: string }
  | { type: "PlayerHealth"; id: string; health: number }
  | { type: "PlayerDied"; id: string; username: string }
  | { type: "PlayerKnockback"; id: string; dx: number; dy: number; dz: number };

export type ClientEvent =
  | { type: "Join"; username: string }
  | { type: "Move"; x: number; y: number; z: number; yaw: number }
  | { type: "BlockBreak"; x: number; y: number; z: number }
  | { type: "BlockPlace"; x: number; y: number; z: number; block_id: number }
  | { type: "RequestChunk"; cx: number; cz: number }
  | { type: "ChatMessage"; message: string }
  | { type: "PlayerHit"; target_id: string };

const POSITION_SEND_INTERVAL_MS = 50;
const POSITION_CHANGE_THRESHOLD = 0.01;
const YAW_CHANGE_THRESHOLD = 0.01;

export class Connection {
  myId: string;
  chunkManager: ChunkManager;

  private ws: WebSocket;
  private player: Player;
  private remotePlayersMap = new Map<string, RemotePlayer>();

  private lastSentPosition = new THREE.Vector3();
  private lastSentYaw = 0;
  private positionInterval: number;
  private hasDisconnected = false;

  constructor(
    ip: string,
    username: string,
    player: Player,
    world: World,
    chunkManager: ChunkManager,
    scene: THREE.Scene,
  ) {
    this.myId = "";
    this.player = player;
    this.chunkManager = chunkManager;
    this.ws = new WebSocket(`ws://${ip}/ws`);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.sendEvent({ type: "Join", username });
    };

    this.ws.onclose = () => {
      if (!this.hasDisconnected) {
        this.hasDisconnected = true;
        sendChat("Disconnected from server.");
      }
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    this.ws.onmessage = (e) => {
      let event: ServerEvent;

      try {
        event = decode(new Uint8Array(e.data)) as ServerEvent;
      } catch (err) {
        console.error("Failed to decode server event", err);
        return;
      }

      try {
        this.handleEvent(event, world, scene);
      } catch (err) {
        console.error("Failed to handle server event", event, err);
      }
    };

    // send player position to server
    this.positionInterval = window.setInterval(
      () => this.sendPosition(player),
      POSITION_SEND_INTERVAL_MS,
    );
  }

  disconnect() {
    clearInterval(this.positionInterval);
    this.ws.close();
  }

  private handleEvent(event: ServerEvent, world: World, scene: THREE.Scene) {
    switch (event.type) {
      // if server is ready, start requesting chunks
      case "Ready": {
        this.chunkManager.start();
        this.myId = event.id;
        break;
      }

      // if received chunk data
      case "ChunkData": {
        const chunk = new Chunk(event.cx, event.cz);
        chunk.blocks = decodeRle(new Uint8Array(event.blocks));
        world.addChunk(chunk);
        this.chunkManager.markReceived(event.cx, event.cz);
        break;
      }

      // for syncing existing players when joining
      case "PlayerSync": {
        this.remotePlayersMap.set(
          event.id,
          new RemotePlayer(event.id, event.username, scene),
        );
        break;
      }

      // if a new player joined
      case "PlayerJoined": {
        this.remotePlayersMap.set(
          event.id,
          new RemotePlayer(event.id, event.username, scene),
        );
        sendChat(`${event.username} joined the game`);
        break;
      }

      // if a player left
      case "PlayerLeft": {
        this.remotePlayersMap.get(event.id)?.remove(scene);
        this.remotePlayersMap.delete(event.id);
        sendChat(`${event.username} left the game`);
        break;
      }

      // if a player position changes
      case "PlayerPosition": {
        this.remotePlayersMap
          .get(event.id)
          ?.updatePosition(event.x, event.y, event.z, event.yaw);
        break;
      }

      // if a block is updated
      case "BlockUpdate": {
        world.setBlock(event.x, event.y, event.z, event.block_id);
        world.remeshAt(event.x, event.z);
        break;
      }

      // sync server time
      case "TimeUpdate": {
        receiveServerTime(event.time);
        break;
      }

      // if a chat message is received
      case "ChatMessage": {
        sendChat(`${event.username}: ${event.message}`);
        break;
      }

      case "PlayerKnockback": {
        if (event.id === this.myId) {
          this.player.knockback.x +=
            event.dx * CONFIG.player.horizontalKnockback;
          this.player.knockback.z +=
            event.dz * CONFIG.player.horizontalKnockback;
          this.player.velocity.y += CONFIG.player.verticalKnockback;
        }
        break;
      }

      case "PlayerHealth": {
        if (event.id === this.myId) {
          this.player.updateHealth(event.health);
        } else {
          this.remotePlayersMap.get(event.id)?.updateHealth(event.health);
        }
        break;
      }

      case "PlayerDied": {
        if (event.id === this.myId) {
          sendChat(`${event.username} died.`);
          this.player.position.set(
            CONFIG.world.initialSpawn.x,
            CONFIG.world.initialSpawn.y,
            CONFIG.world.initialSpawn.z,
          );
          this.player.velocity.set(0, 0, 0);
        }
        break;
      }
    }
  }

  private sendPosition(player: Player) {
    const positionChanged =
      player.position.distanceTo(this.lastSentPosition) >
      POSITION_CHANGE_THRESHOLD;

    const yawChanged =
      Math.abs(player.yaw - this.lastSentYaw) > YAW_CHANGE_THRESHOLD;

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

  sendEvent(event: ClientEvent) {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(encode(event));
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

  getPlayerIdFromMesh(object: THREE.Object3D): string | null {
    for (const [id, remotePlayer] of this.remotePlayersMap) {
      if (remotePlayer.mesh === object) {
        return id;
      }
    }
    return null;
  }

  updateRemotePlayers() {
    this.remotePlayersMap.forEach((p) => p.tick());
  }
}
