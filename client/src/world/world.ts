import * as THREE from "three";
import { Chunk, CHUNK_SIZE } from "./chunk";
import { meshChunkGreedy } from "./greedyMesher";

export class World {
  chunkMap: Map<number, Chunk> = new Map();
  meshMap: Map<number, THREE.Mesh> = new Map();

  private toLocalCoord(coord: number): number {
    return ((Math.floor(coord) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  }

  private toChunkCoord(coord: number): number {
    return Math.floor(coord / CHUNK_SIZE);
  }

  // magic idk
  getKey(x: number, z: number): number {
    return (x << 16) | (z & 0xffff);
  }

  remeshWithWorldPos(x: number, z: number, scene: THREE.Scene) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.chunkMap.get(this.getKey(cx, cz));

    if (chunk) this.remeshChunk(chunk, scene);
  }

  remeshChunk(chunk: Chunk, scene: THREE.Scene) {
    const neighbors = {
      px: this.chunkMap.get(this.getKey(chunk.x + 1, chunk.z)) ?? null,
      nx: this.chunkMap.get(this.getKey(chunk.x - 1, chunk.z)) ?? null,
      pz: this.chunkMap.get(this.getKey(chunk.x, chunk.z + 1)) ?? null,
      nz: this.chunkMap.get(this.getKey(chunk.x, chunk.z - 1)) ?? null,
    };

    const key = this.getKey(chunk.x, chunk.z);
    const oldMesh = this.meshMap.get(key);
    if (oldMesh) {
      scene.remove(oldMesh);
      oldMesh.geometry.dispose();
    }

    const newMesh = meshChunkGreedy(chunk, neighbors);
    this.meshMap.set(key, newMesh);
    scene.add(newMesh);
  }

  addChunk(chunk: Chunk, scene: THREE.Scene) {
    this.chunkMap.set(this.getKey(chunk.x, chunk.z), chunk);
    this.remeshChunk(chunk, scene);

    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const neighbor = this.chunkMap.get(
        this.getKey(chunk.x + dx, chunk.z + dz),
      );
      if (neighbor) this.remeshChunk(neighbor, scene);
    }
  }

  getBlock(x: number, y: number, z: number): number {
    const chunk = this.chunkMap.get(
      this.getKey(this.toChunkCoord(x), this.toChunkCoord(z)),
    );

    if (!chunk) return 0;

    const localX = this.toLocalCoord(x);
    const localZ = this.toLocalCoord(z);

    return chunk.getBlock(localX, Math.floor(y), localZ);
  }

  isSolid(x: number, y: number, z: number): boolean {
    const block = this.getBlock(x, y, z);
    return block !== 0 && block !== 5; // 0 = air, 5 = water
  }

  setBlock(x: number, y: number, z: number, type: number) {
    const chunkX = this.toChunkCoord(x);
    const chunkZ = this.toChunkCoord(z);
    const chunk = this.chunkMap.get(this.getKey(chunkX, chunkZ));
    if (!chunk) return;

    const localX = this.toLocalCoord(x);
    const localZ = this.toLocalCoord(z);
    chunk.setBlock(localX, Math.floor(y), localZ, type);

    return chunk;
  }
}
