import { CHUNK_SIZE } from "./chunk";
import { World } from "./world";

export class ChunkManager {
  private world: World;
  private requestedChunks = new Set<string>();
  private renderDistance: number;

  private ready = false;

  constructor(world: World, renderDistance: number) {
    this.world = world;
    this.renderDistance = renderDistance;
  }

  private getKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  start() {
    this.ready = true;
  }

  update(
    playerX: number,
    playerZ: number,
    requestChunk: (cx: number, cz: number) => void,
  ) {
    if (!this.ready) return;

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
          this.requestedChunks.add(key);
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
      this.world.unloadChunk(x, z);
      this.requestedChunks.delete(this.getKey(x, z));
    }
  }

  markReceived(cx: number, cz: number) {
    this.requestedChunks.add(this.getKey(cx, cz));
  }
}
