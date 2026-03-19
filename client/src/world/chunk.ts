export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

export class Chunk {
  blocks: Uint8Array;
  x: number;
  z: number;

  constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
  }

  private getIndex(x: number, y: number, z: number): number {
    return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
  }

  inChunk(x: number, y: number, z: number): boolean {
    return (
      x >= 0 &&
      x < CHUNK_SIZE &&
      y >= 0 &&
      y < CHUNK_HEIGHT &&
      z >= 0 &&
      z < CHUNK_SIZE
    );
  }

  getBlock(x: number, y: number, z: number): number {
    if (!this.inChunk(x, y, z)) return 0;
    return this.blocks[this.getIndex(x, y, z)];
  }

  setBlock(x: number, y: number, z: number, type: number) {
    if (!this.inChunk(x, y, z)) return;
    this.blocks[this.getIndex(x, y, z)] = type;
  }
}
