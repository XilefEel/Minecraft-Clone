import { decode, encode } from "@msgpack/msgpack";
import { Chunk } from "../world/chunk";
import type { Player } from "../player/player";
import type { World } from "../world/world";
import * as THREE from "three";
import { RemotePlayer } from "../player/remotePlayer";
import { notify } from "../ui/chat";
import { receiveServerTime } from "../scene/dayNight";
import type { ChunkManager } from "../world/chunkManager";

export type ServerEvent =
  | { type: "Ready" }
  | { type: "ChunkData"; cx: number; cz: number; blocks: number[] }
  | { type: "PlayerJoined"; id: string }
  | { type: "PlayerLeft"; id: string }
  | {
      type: "PlayerPosition";
      id: string;
      x: number;
      y: number;
      z: number;
      yaw: number;
    }
  | { type: "BlockUpdate"; x: number; y: number; z: number; block_id: number }
  | { type: "TimeUpdate"; time: number };

export type ClientEvent =
  | { type: "Ready" }
  | { type: "Move"; x: number; y: number; z: number; yaw: number }
  | { type: "BlockBreak"; x: number; y: number; z: number }
  | { type: "BlockPlace"; x: number; y: number; z: number; block_id: number }
  | { type: "RequestChunk"; cx: number; cz: number };

export class Connection {
  chunkManager: ChunkManager;

  private ws: WebSocket;
  private remotePlayersMap = new Map<string, RemotePlayer>();

  private lastSentPosition = new THREE.Vector3();
  private lastSentYaw = 0;

  constructor(
    player: Player,
    world: World,
    chunkManager: ChunkManager,
    scene: THREE.Scene,
  ) {
    this.chunkManager = chunkManager;
    this.ws = new WebSocket("ws://localhost:3000/ws");
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      console.log("connected to server");
      this.sendEvent({ type: "Ready" });
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
      case "Ready":
        console.log("server ready, starting chunk manager");
        this.chunkManager.start();
        break;

      // if received chunk data
      case "ChunkData":
        const chunk = new Chunk(event.cx, event.cz);
        chunk.blocks = new Uint8Array(event.blocks);
        world.addChunk(chunk);
        this.chunkManager.markReceived(event.cx, event.cz);
        break;

      // if a new player joined
      case "PlayerJoined":
        this.remotePlayersMap.set(event.id, new RemotePlayer(event.id, scene));
        notify(`${event.id.slice(0, 8)} joined the game`);
        break;

      // if a player left
      case "PlayerLeft":
        this.remotePlayersMap.get(event.id)?.remove(scene);
        this.remotePlayersMap.delete(event.id);
        notify(`${event.id.slice(0, 8)} left the game`);
        break;

      // if a player position changes
      case "PlayerPosition":
        if (!this.remotePlayersMap.has(event.id)) {
          this.remotePlayersMap.set(
            event.id,
            new RemotePlayer(event.id, scene),
          );
        }

        this.remotePlayersMap
          .get(event.id)
          ?.onServerUpdate(event.x, event.y, event.z, event.yaw);

        break;

      // if a block is updated
      case "BlockUpdate":
        world.setBlock(event.x, event.y, event.z, event.block_id);
        world.remeshAt(event.x, event.z);
        break;

      case "TimeUpdate":
        receiveServerTime(event.time);
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
