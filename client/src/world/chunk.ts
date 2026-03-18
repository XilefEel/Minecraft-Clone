export const CHUNK_SIZE = 16;

export class Chunk {
  blocks: Uint8Array;
  x: number;
  z: number;

  constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
  }

  private getIndex(x: number, y: number, z: number): number {
    return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
  }

  inChunk(x: number, y: number, z: number): boolean {
    return (
      x >= 0 &&
      x < CHUNK_SIZE &&
      y >= 0 &&
      y < CHUNK_SIZE &&
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

  fill() {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const height = (function () {
          const r = Math.random();

          if (r < 0.2) return 4;
          if (r < 0.5) return 5;
          if (r < 0.8) return 6;
          return 7;
        })();

        this.setBlock(x, 0, z, 4);
        for (let y = 1; y <= height; y++) this.setBlock(x, y, z, 2);
        for (let y = height + 1; y <= height + 3; y++)
          this.setBlock(x, y, z, 3);
        this.setBlock(x, height + 4, z, 1);
      }
    }
  }
}
