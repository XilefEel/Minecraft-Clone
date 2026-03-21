import * as THREE from "three";
import { CHUNK_SIZE } from "./chunk";
import { World } from "./world";

export class ChunkManager {
  private world: World;
  private scene: THREE.Scene;

  private requestedChunks = new Set<string>();
  private renderDistance = 8;

  constructor(world: World, scene: THREE.Scene) {
    this.world = world;
    this.scene = scene;
  }

  private getKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  update(
    playerX: number,
    playerZ: number,
    requestChunk: (cx: number, cz: number) => void,
  ) {
    const cx = Math.floor(playerX / CHUNK_SIZE);
    const cz = Math.floor(playerZ / CHUNK_SIZE);

    // load new chunks
    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
        if (Math.sqrt(dx * dx + dz * dz) > this.renderDistance) continue;

        const ncx = cx + dx;
        const ncz = cz + dz;
        const key = this.getKey(ncx, ncz);
        if (!this.requestedChunks.has(key)) {
          requestChunk(ncx, ncz);
        }
      }
    }

    // unload distant chunks
    const toUnload: { x: number; z: number }[] = [];
    for (const chunk of this.world.chunkMap.values()) {
      const dist = Math.sqrt((chunk.x - cx) ** 2 + (chunk.z - cz) ** 2);
      if (dist > this.renderDistance + 1) {
        toUnload.push({ x: chunk.x, z: chunk.z });
      }
    }

    for (const { x, z } of toUnload) {
      const key = this.world.getKey(x, z);
      const mesh = this.world.meshMap.get(key);
      if (mesh) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
      }
      this.world.meshMap.delete(key);
      this.world.chunkMap.delete(key);
      this.requestedChunks.delete(this.getKey(x, z));
    }
  }

  markReceived(cx: number, cz: number) {
    this.requestedChunks.add(this.getKey(cx, cz));
  }
}
