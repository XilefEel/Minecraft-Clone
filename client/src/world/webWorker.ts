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

const AO_BRIGHTNESS = [0.25, 0.5, 0.75, 1.0];

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

function vertexAO(side1: boolean, side2: boolean, corner: boolean): number {
  if (side1 && side2) {
    return 0;
  }
  return 3 - (Number(side1) + Number(side2) + Number(corner));
}

function addFace(
  positions: number[],
  colors: number[],
  indices: number[],
  corners: [number, number, number][],
  ao0: number,
  ao1: number,
  ao2: number,
  ao3: number,
  block: number,
  direction: 1 | -1,
) {
  const vi = positions.length / 3;

  const base = block * 3;
  const r = BLOCK_RGB[base + 0];
  const g = BLOCK_RGB[base + 1];
  const b = BLOCK_RGB[base + 2];

  const brightness0 = AO_BRIGHTNESS[ao0];
  const brightness1 = AO_BRIGHTNESS[ao1];
  const brightness2 = AO_BRIGHTNESS[ao2];
  const brightness3 = AO_BRIGHTNESS[ao3];

  const c0 = corners[0];
  const c1 = corners[1];
  const c2 = corners[2];
  const c3 = corners[3];

  positions.push(c0[0], c0[1], c0[2]);
  colors.push(r * brightness0, g * brightness0, b * brightness0);

  positions.push(c1[0], c1[1], c1[2]);
  colors.push(r * brightness1, g * brightness1, b * brightness1);

  positions.push(c2[0], c2[1], c2[2]);
  colors.push(r * brightness2, g * brightness2, b * brightness2);

  positions.push(c3[0], c3[1], c3[2]);
  colors.push(r * brightness3, g * brightness3, b * brightness3);

  const flip = ao0 + ao3 > ao1 + ao2;

  if (direction === 1) {
    if (flip) {
      indices.push(vi, vi + 2, vi + 3, vi, vi + 3, vi + 1);
    } else {
      indices.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
    }
  } else {
    if (flip) {
      indices.push(vi, vi + 3, vi + 2, vi, vi + 1, vi + 3);
    } else {
      indices.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
    }
  }
}

function meshXAxis(
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
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = blocks[getIndex(x, y, z)];
        if (block === 0) continue;

        const nx = x + direction;
        const neighbor = getBlock(blocks, neighbors, nx, y, z);
        if (neighbor !== 0) continue;

        const wx = chunkX * CHUNK_SIZE + x;
        const wz = chunkZ * CHUNK_SIZE + z;
        const faceX = direction === 1 ? wx + 1 : wx;

        // n = negative, p = positive
        const yn = getBlock(blocks, neighbors, nx, y - 1, z) !== 0;
        const yp = getBlock(blocks, neighbors, nx, y + 1, z) !== 0;
        const zn = getBlock(blocks, neighbors, nx, y, z - 1) !== 0;
        const zp = getBlock(blocks, neighbors, nx, y, z + 1) !== 0;
        const ynzn = getBlock(blocks, neighbors, nx, y - 1, z - 1) !== 0;
        const ynzp = getBlock(blocks, neighbors, nx, y - 1, z + 1) !== 0;
        const ypzn = getBlock(blocks, neighbors, nx, y + 1, z - 1) !== 0;
        const ypzp = getBlock(blocks, neighbors, nx, y + 1, z + 1) !== 0;

        const ao0 = vertexAO(yn, zn, ynzn);
        const ao1 = vertexAO(yn, zp, ynzp);
        const ao2 = vertexAO(yp, zn, ypzn);
        const ao3 = vertexAO(yp, zp, ypzp);

        addFace(
          positions,
          colors,
          indices,
          [
            [faceX, y, wz],
            [faceX, y, wz + 1],
            [faceX, y + 1, wz],
            [faceX, y + 1, wz + 1],
          ],
          ao0,
          ao1,
          ao2,
          ao3,
          block,
          direction,
        );
      }
    }
  }
}

function meshYAxis(
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
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = blocks[getIndex(x, y, z)];
        if (block === 0) continue;

        const ny = y + direction;
        const neighbor = getBlock(blocks, neighbors, x, ny, z);
        if (neighbor !== 0) continue;

        const wx = chunkX * CHUNK_SIZE + x;
        const wz = chunkZ * CHUNK_SIZE + z;
        const faceY = direction === 1 ? y + 1 : y;

        // n = negative, p = positive
        const xn = getBlock(blocks, neighbors, x - 1, ny, z) !== 0;
        const xp = getBlock(blocks, neighbors, x + 1, ny, z) !== 0;
        const zn = getBlock(blocks, neighbors, x, ny, z - 1) !== 0;
        const zp = getBlock(blocks, neighbors, x, ny, z + 1) !== 0;
        const xnzn = getBlock(blocks, neighbors, x - 1, ny, z - 1) !== 0;
        const xpzn = getBlock(blocks, neighbors, x + 1, ny, z - 1) !== 0;
        const xnzp = getBlock(blocks, neighbors, x - 1, ny, z + 1) !== 0;
        const xpzp = getBlock(blocks, neighbors, x + 1, ny, z + 1) !== 0;

        const ao0 = vertexAO(xn, zn, xnzn);
        const ao1 = vertexAO(xp, zn, xpzn);
        const ao2 = vertexAO(xn, zp, xnzp);
        const ao3 = vertexAO(xp, zp, xpzp);

        addFace(
          positions,
          colors,
          indices,
          [
            [wx, faceY, wz],
            [wx + 1, faceY, wz],
            [wx, faceY, wz + 1],
            [wx + 1, faceY, wz + 1],
          ],
          ao0,
          ao1,
          ao2,
          ao3,
          block,
          direction,
        );
      }
    }
  }
}

function meshZAxis(
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
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const block = blocks[getIndex(x, y, z)];
        if (block === 0) continue;

        const nz = z + direction;
        const neighbor = getBlock(blocks, neighbors, x, y, nz);
        if (neighbor !== 0) continue;

        const wx = chunkX * CHUNK_SIZE + x;
        const wz = chunkZ * CHUNK_SIZE + z;
        const faceZ = direction === 1 ? wz + 1 : wz;

        // n = negative, p = positive
        const xn = getBlock(blocks, neighbors, x - 1, y, nz) !== 0;
        const xp = getBlock(blocks, neighbors, x + 1, y, nz) !== 0;
        const yn = getBlock(blocks, neighbors, x, y - 1, nz) !== 0;
        const yp = getBlock(blocks, neighbors, x, y + 1, nz) !== 0;
        const xnyn = getBlock(blocks, neighbors, x - 1, y - 1, nz) !== 0;
        const xnyp = getBlock(blocks, neighbors, x - 1, y + 1, nz) !== 0;
        const xpyn = getBlock(blocks, neighbors, x + 1, y - 1, nz) !== 0;
        const xpyp = getBlock(blocks, neighbors, x + 1, y + 1, nz) !== 0;

        const ao0 = vertexAO(xn, yn, xnyn);
        const ao1 = vertexAO(xn, yp, xnyp);
        const ao2 = vertexAO(xp, yn, xpyn);
        const ao3 = vertexAO(xp, yp, xpyp);

        addFace(
          positions,
          colors,
          indices,
          [
            [wx, y, faceZ],
            [wx, y + 1, faceZ],
            [wx + 1, y, faceZ],
            [wx + 1, y + 1, faceZ],
          ],
          ao0,
          ao1,
          ao2,
          ao3,
          block,
          direction,
        );
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

  meshXAxis(blocks, neighbors, chunkX, chunkZ, positions, colors, indices, 1);
  meshXAxis(blocks, neighbors, chunkX, chunkZ, positions, colors, indices, -1);
  meshYAxis(blocks, neighbors, chunkX, chunkZ, positions, colors, indices, 1);
  meshYAxis(blocks, neighbors, chunkX, chunkZ, positions, colors, indices, -1);
  meshZAxis(blocks, neighbors, chunkX, chunkZ, positions, colors, indices, 1);
  meshZAxis(blocks, neighbors, chunkX, chunkZ, positions, colors, indices, -1);

  const posArray = new Float32Array(positions);
  const colArray = new Float32Array(colors);
  const idxArray = new Uint32Array(indices);

  self.postMessage({ posArray, colArray, idxArray, chunkX, chunkZ }, [
    posArray.buffer,
    colArray.buffer,
    idxArray.buffer,
  ]);
};
