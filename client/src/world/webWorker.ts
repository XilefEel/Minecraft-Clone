import { BLOCK_COLORS } from "./blocks";
import { CHUNK_SIZE, CHUNK_HEIGHT } from "./chunk";

type Neighbors = {
  px: Uint8Array | null;
  nx: Uint8Array | null;
  pz: Uint8Array | null;
  nz: Uint8Array | null;
};

const BLOCK_RGB = new Float32Array(256 * 3);

for (let id = 0; id < 256; id++) {
  const hex = BLOCK_COLORS[id] ?? 0xff00ff;
  BLOCK_RGB[id * 3 + 0] = ((hex >> 16) & 0xff) / 255;
  BLOCK_RGB[id * 3 + 1] = ((hex >> 8) & 0xff) / 255;
  BLOCK_RGB[id * 3 + 2] = (hex & 0xff) / 255;
}

// global masks for greedy meshing
const Y_MASK = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
const XZ_MASK = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT);

function getIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
}

function getBlockFromBlocks(
  blocks: Uint8Array,
  x: number,
  y: number,
  z: number,
): number {
  if (
    x < 0 ||
    x >= CHUNK_SIZE ||
    y < 0 ||
    y >= CHUNK_HEIGHT ||
    z < 0 ||
    z >= CHUNK_SIZE
  )
    return 0;

  return blocks[getIndex(x, y, z)];
}

function getBlock(
  blocks: Uint8Array,
  neighbors: Neighbors,
  x: number,
  y: number,
  z: number,
): number {
  if (y < 0 || y >= CHUNK_HEIGHT) return 0;

  if (x < 0)
    return neighbors.nx
      ? getBlockFromBlocks(neighbors.nx, CHUNK_SIZE + x, y, z)
      : 0;
  if (x >= CHUNK_SIZE)
    return neighbors.px
      ? getBlockFromBlocks(neighbors.px, x - CHUNK_SIZE, y, z)
      : 0;

  if (z < 0)
    return neighbors.nz
      ? getBlockFromBlocks(neighbors.nz, x, y, CHUNK_SIZE + z)
      : 0;
  if (z >= CHUNK_SIZE)
    return neighbors.pz
      ? getBlockFromBlocks(neighbors.pz, x, y, z - CHUNK_SIZE)
      : 0;

  return blocks[getIndex(x, y, z)];
}

function addFace(
  positions: number[],
  colors: number[],
  indices: number[],
  corners: [number, number, number][],
  block: number,
  direction: 1 | -1,
) {
  const vi = positions.length / 3;

  for (let i = 0; i < 4; i++) {
    const [x, y, z] = corners[i];
    positions.push(x, y, z);

    const base = block * 3;
    colors.push(BLOCK_RGB[base + 0], BLOCK_RGB[base + 1], BLOCK_RGB[base + 2]);
  }

  if (direction === 1) {
    indices.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
  } else {
    indices.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
  }
}

function greedyYAxis(
  blocks: Uint8Array,
  neighbors: Neighbors,
  chunkX: number,
  chunkZ: number,
  positions: number[],
  colors: number[],
  indices: number[],
  direction: 1 | -1,
) {
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    // reuse mask
    Y_MASK.fill(0);

    // build mask
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = blocks[getIndex(x, y, z)];
        if (block === 0) continue;

        const neighbor = getBlock(blocks, neighbors, x, y + direction, z);
        if (neighbor === 0) {
          Y_MASK[x + z * CHUNK_SIZE] = block;
        }
      }
    }

    for (let z = 0; z < CHUNK_SIZE; z++) {
      let x = 0;
      while (x < CHUNK_SIZE) {
        const block = Y_MASK[x + z * CHUNK_SIZE];
        if (block === 0) {
          x++;
          continue;
        }

        let width = 1;
        while (
          x + width < CHUNK_SIZE &&
          Y_MASK[x + width + z * CHUNK_SIZE] === block
        ) {
          width++;
        }

        let height = 1;
        let done = false;
        while (z + height < CHUNK_SIZE && !done) {
          for (let k = 0; k < width; k++) {
            if (Y_MASK[x + k + (z + height) * CHUNK_SIZE] !== block) {
              done = true;
              break;
            }
          }
          if (!done) height++;
        }

        const wx = chunkX * CHUNK_SIZE + x;
        const wz = chunkZ * CHUNK_SIZE + z;
        const faceY = direction === 1 ? y + 1 : y;

        addFace(
          positions,
          colors,
          indices,
          [
            [wx, faceY, wz],
            [wx + width, faceY, wz],
            [wx, faceY, wz + height],
            [wx + width, faceY, wz + height],
          ],
          block,
          direction,
        );

        // clear mask region
        for (let dz = 0; dz < height; dz++) {
          const row = (z + dz) * CHUNK_SIZE;
          for (let dx = 0; dx < width; dx++) {
            Y_MASK[x + dx + row] = 0;
          }
        }

        x += width;
      }
    }
  }
}

function greedyXAxis(
  blocks: Uint8Array,
  neighbors: Neighbors,
  chunkX: number,
  chunkZ: number,
  positions: number[],
  colors: number[],
  indices: number[],
  direction: 1 | -1,
) {
  for (let x = 0; x < CHUNK_SIZE; x++) {
    XZ_MASK.fill(0);

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = blocks[getIndex(x, y, z)];
        if (block === 0) continue;

        const neighbor = getBlock(blocks, neighbors, x + direction, y, z);
        if (neighbor === 0) {
          XZ_MASK[z + y * CHUNK_SIZE] = block;
        }
      }
    }

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      let z = 0;
      while (z < CHUNK_SIZE) {
        const block = XZ_MASK[z + y * CHUNK_SIZE];
        if (block === 0) {
          z++;
          continue;
        }

        let width = 1;
        while (
          z + width < CHUNK_SIZE &&
          XZ_MASK[z + width + y * CHUNK_SIZE] === block
        ) {
          width++;
        }

        let height = 1;
        let done = false;
        while (y + height < CHUNK_HEIGHT && !done) {
          for (let k = 0; k < width; k++) {
            if (XZ_MASK[z + k + (y + height) * CHUNK_SIZE] !== block) {
              done = true;
              break;
            }
          }
          if (!done) height++;
        }

        const wx = chunkX * CHUNK_SIZE + x;
        const wz = chunkZ * CHUNK_SIZE + z;
        const faceX = direction === 1 ? wx + 1 : wx;

        addFace(
          positions,
          colors,
          indices,
          [
            [faceX, y, wz],
            [faceX, y, wz + width],
            [faceX, y + height, wz],
            [faceX, y + height, wz + width],
          ],
          block,
          direction,
        );

        for (let dy = 0; dy < height; dy++) {
          const row = (y + dy) * CHUNK_SIZE;
          for (let dz = 0; dz < width; dz++) {
            XZ_MASK[z + dz + row] = 0;
          }
        }

        z += width;
      }
    }
  }
}

function greedyZAxis(
  blocks: Uint8Array,
  neighbors: Neighbors,
  chunkX: number,
  chunkZ: number,
  positions: number[],
  colors: number[],
  indices: number[],
  direction: 1 | -1,
) {
  for (let z = 0; z < CHUNK_SIZE; z++) {
    XZ_MASK.fill(0);

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const block = blocks[getIndex(x, y, z)];
        if (block === 0) continue;

        const neighbor = getBlock(blocks, neighbors, x, y, z + direction);
        if (neighbor === 0) {
          XZ_MASK[x + y * CHUNK_SIZE] = block;
        }
      }
    }

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      let x = 0;
      while (x < CHUNK_SIZE) {
        const block = XZ_MASK[x + y * CHUNK_SIZE];
        if (block === 0) {
          x++;
          continue;
        }

        let width = 1;
        while (
          x + width < CHUNK_SIZE &&
          XZ_MASK[x + width + y * CHUNK_SIZE] === block
        ) {
          width++;
        }

        let height = 1;
        let done = false;
        while (y + height < CHUNK_HEIGHT && !done) {
          for (let k = 0; k < width; k++) {
            if (XZ_MASK[x + k + (y + height) * CHUNK_SIZE] !== block) {
              done = true;
              break;
            }
          }
          if (!done) height++;
        }

        const wx = chunkX * CHUNK_SIZE + x;
        const wz = chunkZ * CHUNK_SIZE + z;
        const faceZ = direction === 1 ? wz + 1 : wz;

        addFace(
          positions,
          colors,
          indices,
          [
            [wx, y, faceZ],
            [wx, y + height, faceZ],
            [wx + width, y, faceZ],
            [wx + width, y + height, faceZ],
          ],
          block,
          direction,
        );

        for (let dy = 0; dy < height; dy++) {
          const row = (y + dy) * CHUNK_SIZE;
          for (let dx = 0; dx < width; dx++) {
            XZ_MASK[x + dx + row] = 0;
          }
        }

        x += width;
      }
    }
  }
}

self.onmessage = (e) => {
  const { blocks, chunkX, chunkZ, neighbors } = e.data as {
    blocks: Uint8Array;
    chunkX: number;
    chunkZ: number;
    neighbors: Neighbors;
  };

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  greedyXAxis(blocks, neighbors, chunkX, chunkZ, positions, colors, indices, 1);
  greedyXAxis(
    blocks,
    neighbors,
    chunkX,
    chunkZ,
    positions,
    colors,
    indices,
    -1,
  );
  greedyYAxis(blocks, neighbors, chunkX, chunkZ, positions, colors, indices, 1);
  greedyYAxis(
    blocks,
    neighbors,
    chunkX,
    chunkZ,
    positions,
    colors,
    indices,
    -1,
  );
  greedyZAxis(blocks, neighbors, chunkX, chunkZ, positions, colors, indices, 1);
  greedyZAxis(
    blocks,
    neighbors,
    chunkX,
    chunkZ,
    positions,
    colors,
    indices,
    -1,
  );

  const posArray = new Float32Array(positions);
  const colArray = new Float32Array(colors);
  const idxArray = new Uint32Array(indices);

  self.postMessage({ posArray, colArray, idxArray, chunkX, chunkZ }, [
    posArray.buffer,
    colArray.buffer,
    idxArray.buffer,
  ]);
};
