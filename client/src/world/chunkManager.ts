import * as THREE from "three";
import { CHUNK_SIZE } from "./chunk";
import { World } from "./world";

export class ChunkManager {
  private world: World;
  private scene: THREE.Scene;

  private requestedChunks = new Set<string>();
  private renderDistance = 4;

  private chunkCache = new Map<string, { lastSeen: number }>();
  private maxCachedChunks = 500;

  constructor(world: World, scene: THREE.Scene) {
    this.world = world;
    this.scene = scene;
  }

  private key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  update(
    playerX: number,
    playerZ: number,
    requestChunk: (cx: number, cz: number) => void,
  ) {
    const cx = Math.floor(playerX / CHUNK_SIZE);
    const cz = Math.floor(playerZ / CHUNK_SIZE);

    const toUnload: { x: number; z: number }[] = [];

    // load new chunks
    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
        const ncx = cx + dx;
        const ncz = cz + dz;
        const key = this.key(ncx, ncz);

        if (!this.requestedChunks.has(key)) {
          this.requestedChunks.add(key);
          requestChunk(ncx, ncz);
        }
      }
    }

    // unload distant chunks
    for (const chunk of this.world.chunkMap.values()) {
      const dist = Math.max(Math.abs(chunk.x - cx), Math.abs(chunk.z - cz));
      if (dist > this.renderDistance + 1) {
        toUnload.push({ x: chunk.x, z: chunk.z });
      }
    }

    for (const { x, z } of toUnload) {
      const key = this.world.getKey(x, z);
      const mesh = this.world.meshMap.get(key);
      if (mesh) {
        this.scene.remove(mesh);
      }
      this.chunkCache.set(this.key(x, z), { lastSeen: Date.now() });
    }

    // clean up old cached chunks
    if (this.chunkCache.size > this.maxCachedChunks) {
      const sorted = [...this.chunkCache.entries()].sort(
        (a, b) => a[1].lastSeen - b[1].lastSeen,
      );

      const toBeRemoved = sorted.slice(
        0,
        this.chunkCache.size - this.maxCachedChunks,
      );

      for (const [key] of toBeRemoved) {
        const [cx, cz] = key.split(",").map(Number);
        const worldKey = this.world.getKey(cx, cz);
        this.world.meshMap.get(worldKey)?.geometry.dispose();
        this.world.meshMap.delete(worldKey);
        this.world.chunkMap.delete(worldKey);
        this.chunkCache.delete(key);
      }
    }
  }
}
