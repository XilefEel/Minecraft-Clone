import * as THREE from "three";
import { Chunk, CHUNK_SIZE } from "./chunk";
import { meshChunk } from "./chunkMesher";

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
    const key = this.getKey(chunk.x, chunk.z);
    const oldMesh = this.meshMap.get(key);
    if (oldMesh) {
      scene.remove(oldMesh);
      oldMesh.geometry.dispose();
    }
    const newMesh = meshChunk(chunk);
    this.meshMap.set(key, newMesh);
    scene.add(newMesh);
  }

  addChunk(chunk: Chunk) {
    this.chunkMap.set(this.getKey(chunk.x, chunk.z), chunk);
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
    return this.getBlock(x, y, z) !== 0;
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
