import { BLOCK_COLORS } from "./blocks";
import { CHUNK_SIZE, CHUNK_HEIGHT } from "./chunk";

type Neighbors = {
  px: Uint8Array | null;
  nx: Uint8Array | null;
  pz: Uint8Array | null;
  nz: Uint8Array | null;
};

function hexToRgb(hex: number): [number, number, number] {
  return [
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  ];
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
  return blocks[x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT];
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

  return getBlockFromBlocks(blocks, x, y, z);
}

function addFaces(
  positions: number[],
  colors: number[],
  indices: number[],
  corners: [number, number, number][],
  block: number,
  direction: 1 | -1,
) {
  const hex = BLOCK_COLORS[block] ?? 0xff00ff;
  const [r, g, b] = hexToRgb(hex);
  const vi = positions.length / 3;

  for (const [x, y, z] of corners) positions.push(x, y, z);
  for (let i = 0; i < 4; i++) colors.push(r, g, b);

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
  // for every y slice
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    const mask: (number | null)[] = new Array(CHUNK_SIZE * CHUNK_SIZE).fill(
      null,
    );

    // build the mask
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = getBlockFromBlocks(blocks, x, y, z);
        const neighbor = getBlock(blocks, neighbors, x, y + direction, z);
        if (block !== 0 && neighbor === 0) {
          mask[x + z * CHUNK_SIZE] = block;
        }
      }
    }

    for (let z = 0; z < CHUNK_SIZE; z++) {
      let x = 0;
      while (x < CHUNK_SIZE) {
        // the current block type
        const block = mask[x + z * CHUNK_SIZE];
        // skip if no block
        if (block === null) {
          x++;
          continue;
        }

        // if block exists, find width and height of the face

        // increase width while same block type
        let width = 1;
        while (
          x + width < CHUNK_SIZE &&
          mask[x + width + z * CHUNK_SIZE] === block
        ) {
          width++;
        }

        // increase row height while same block type
        let height = 1;
        let done = false;
        while (z + height < CHUNK_SIZE && !done) {
          for (let k = 0; k < width; k++) {
            if (mask[x + k + (z + height) * CHUNK_SIZE] !== block) {
              done = true;
              break;
            }
          }
          if (!done) height++;
        }

        // add face for the rectangle
        const wx = chunkX * CHUNK_SIZE + x;
        const wz = chunkZ * CHUNK_SIZE + z;
        const faceY = direction === 1 ? y + 1 : y;

        addFaces(
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

        // clear mask so we don't reuse blocks for other faces
        for (let dz = 0; dz < height; dz++) {
          for (let dx = 0; dx < width; dx++) {
            mask[x + dx + (z + dz) * CHUNK_SIZE] = null;
          }
        }

        // skip to the next unchecked block
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
    const mask: (number | null)[] = new Array(CHUNK_SIZE * CHUNK_HEIGHT).fill(
      null,
    );

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = getBlockFromBlocks(blocks, x, y, z);
        const neighbor = getBlock(blocks, neighbors, x + direction, y, z);
        if (block !== 0 && neighbor === 0) {
          mask[z + y * CHUNK_SIZE] = block;
        }
      }
    }

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      let z = 0;
      while (z < CHUNK_SIZE) {
        const block = mask[z + y * CHUNK_SIZE];
        if (block === null) {
          z++;
          continue;
        }

        let width = 1;
        while (
          z + width < CHUNK_SIZE &&
          mask[z + width + y * CHUNK_SIZE] === block
        ) {
          width++;
        }

        let height = 1;
        let done = false;
        while (y + height < CHUNK_HEIGHT && !done) {
          for (let k = 0; k < width; k++) {
            if (mask[z + k + (y + height) * CHUNK_SIZE] !== block) {
              done = true;
              break;
            }
          }
          if (!done) height++;
        }

        const wx = chunkX * CHUNK_SIZE + x;
        const wz = chunkZ * CHUNK_SIZE + z;
        const faceX = direction === 1 ? wx + 1 : wx;

        addFaces(
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
          for (let dz = 0; dz < width; dz++) {
            mask[z + dz + (y + dy) * CHUNK_SIZE] = null;
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
    const mask: (number | null)[] = new Array(CHUNK_SIZE * CHUNK_HEIGHT).fill(
      null,
    );

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const block = getBlockFromBlocks(blocks, x, y, z);
        const neighbor = getBlock(blocks, neighbors, x, y, z + direction);
        if (block !== 0 && neighbor === 0) {
          mask[x + y * CHUNK_SIZE] = block;
        }
      }
    }

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      let x = 0;
      while (x < CHUNK_SIZE) {
        const block = mask[x + y * CHUNK_SIZE];
        if (block === null) {
          x++;
          continue;
        }

        let width = 1;
        while (
          x + width < CHUNK_SIZE &&
          mask[x + width + y * CHUNK_SIZE] === block
        ) {
          width++;
        }

        let height = 1;
        let done = false;
        while (y + height < CHUNK_HEIGHT && !done) {
          for (let k = 0; k < width; k++) {
            if (mask[x + k + (y + height) * CHUNK_SIZE] !== block) {
              done = true;
              break;
            }
          }
          if (!done) height++;
        }

        const wx = chunkX * CHUNK_SIZE + x;
        const wz = chunkZ * CHUNK_SIZE + z;
        const faceZ = direction === 1 ? wz + 1 : wz;

        addFaces(
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
          for (let dx = 0; dx < width; dx++) {
            mask[x + dx + (y + dy) * CHUNK_SIZE] = null;
          }
        }

        x += width;
      }
    }
  }
}

// listen for messages from the main thread
self.onmessage = (e) => {
  const { blocks, chunkX, chunkZ, neighbors } = e.data;

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
