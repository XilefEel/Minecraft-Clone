import { decode, encode } from "@msgpack/msgpack";
import { Chunk } from "../world/chunk";
import type { Player } from "../player/player";
import type { World } from "../world/world";
import * as THREE from "three";
import { RemotePlayer } from "../player/remotePlayer";
import { meshChunk } from "../world/chunkMesher";
import { notify } from "../ui/chat";

export type ServerEvent =
  | { type: "ChunkData"; cx: number; cz: number; blocks: number[] }
  | { type: "PlayerJoined"; id: string }
  | { type: "PlayerLeft"; id: string }
  | { type: "PlayerPosition"; id: string; x: number; y: number; z: number }
  | { type: "BlockUpdate"; x: number; y: number; z: number; block_id: number };

export type ClientEvent =
  | { type: "Move"; x: number; y: number; z: number }
  | { type: "BlockBreak"; x: number; y: number; z: number }
  | { type: "BlockPlace"; x: number; y: number; z: number; block_id: number };

export class Connection {
  private ws: WebSocket;
  private remotePlayersMap = new Map<string, RemotePlayer>();
  private lastSentPosition = new THREE.Vector3();

  constructor(player: Player, world: World, scene: THREE.Scene) {
    this.ws = new WebSocket("ws://localhost:3000/ws");
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => console.log("connected to server");
    this.ws.onclose = () => console.log("disconnected from server");

    this.ws.onmessage = (e) => {
      const event = decode(new Uint8Array(e.data)) as ServerEvent;
      this.handleEvent(event, world, scene);
    };

    // send player position to server
    setInterval(() => this.sendPosition(player), 50);
  }

  private sendPosition(player: Player) {
    if (player.position.distanceTo(this.lastSentPosition) < 0.01) return;

    this.lastSentPosition.copy(player.position);
    this.sendEvent({
      type: "Move",
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    });
  }

  private handleEvent(event: ServerEvent, world: World, scene: THREE.Scene) {
    switch (event.type) {
      // if received chunk data
      case "ChunkData":
        const chunk = new Chunk(event.cx, event.cz);
        chunk.blocks = new Uint8Array(event.blocks);

        world.addChunk(chunk);
        const mesh = meshChunk(chunk);
        world.meshMap.set(world.getKey(chunk.x, chunk.z), mesh);
        scene.add(mesh);
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
          ?.updatePosition(event.x, event.y, event.z);

        break;

      // if a block is updated
      case "BlockUpdate":
        world.setBlock(event.x, event.y, event.z, event.block_id);
        world.remeshWithWorldPos(event.x, event.z, scene);
        break;
    }
  }

  updateRemotePlayers() {
    this.remotePlayersMap.forEach((p) => p.updateRenderedPosition());
  }

  sendEvent(event: ClientEvent) {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(encode(event));
  }
}
