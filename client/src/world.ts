import { Chunk, CHUNK_SIZE } from "./chunk";

export class World {
  chunkMap: Map<number, Chunk> = new Map();

  // magic idk
  private getKey(x: number, z: number) {
    return (x << 16) | (z & 0xffff);
  }

  private toLocalCoord(coord: number): number {
    return ((Math.floor(coord) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  }

  private toChunkCoord(coord: number): number {
    return Math.floor(coord / CHUNK_SIZE);
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
}
