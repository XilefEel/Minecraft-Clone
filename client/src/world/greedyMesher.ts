import * as THREE from "three";
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from "./chunk";
import { BLOCK_COLORS } from "./blocks";

export function meshChunkGreedy(chunk: Chunk): THREE.Mesh {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  greedyXAxis(chunk, positions, colors, indices, 1);
  greedyXAxis(chunk, positions, colors, indices, -1);

  greedyYAxis(chunk, positions, colors, indices, 1);
  greedyYAxis(chunk, positions, colors, indices, -1);

  greedyZAxis(chunk, positions, colors, indices, 1);
  greedyZAxis(chunk, positions, colors, indices, -1);

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);

  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });

  return new THREE.Mesh(geometry, material);
}

function greedyYAxis(
  chunk: Chunk,
  positions: number[],
  colors: number[],
  indices: number[],
  direction: 1 | -1,
) {
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    const mask: (number | null)[] = new Array(CHUNK_SIZE * CHUNK_SIZE).fill(
      null,
    );

    // create mask (XZ plane)
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = chunk.getBlock(x, y, z);

        const neighbor = chunk.getBlock(x, y + direction, z);
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

        // if no block to render, skip
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

        // add face
        addYFace(
          positions,
          colors,
          indices,
          x,
          y,
          z,
          width,
          height,
          block,
          chunk,
          direction,
        );

        // clear mask
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

function addYFace(
  positions: number[],
  colors: number[],
  indices: number[],
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  block: number,
  chunk: Chunk,
  direction: 1 | -1,
) {
  const wx = chunk.x * CHUNK_SIZE + x;
  const wz = chunk.z * CHUNK_SIZE + z;
  const faceY = direction === 1 ? y + 1 : y;

  addFaceShared(
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
}

function greedyXAxis(
  chunk: Chunk,
  positions: number[],
  colors: number[],
  indices: number[],
  direction: 1 | -1,
) {
  for (let x = 0; x < CHUNK_SIZE; x++) {
    const mask: (number | null)[] = new Array(CHUNK_SIZE * CHUNK_HEIGHT).fill(
      null,
    );

    // Build mask (ZY plane)
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = chunk.getBlock(x, y, z);
        const neighbor = chunk.getBlock(x + direction, y, z);

        if (block !== 0 && neighbor === 0) {
          mask[z + y * CHUNK_SIZE] = block;
        }
      }
    }

    // Greedy merge
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      let z = 0;
      while (z < CHUNK_SIZE) {
        const block = mask[z + y * CHUNK_SIZE];

        if (block === null) {
          z++;
          continue;
        }

        // Width (along Z)
        let width = 1;
        while (
          z + width < CHUNK_SIZE &&
          mask[z + width + y * CHUNK_SIZE] === block
        ) {
          width++;
        }

        // Height (along Y)
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

        addXFace(
          positions,
          colors,
          indices,
          x,
          y,
          z,
          width,
          height,
          block,
          chunk,
          direction,
        );

        // Clear mask
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

function addXFace(
  positions: number[],
  colors: number[],
  indices: number[],
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  block: number,
  chunk: Chunk,
  direction: 1 | -1,
) {
  const wx = chunk.x * CHUNK_SIZE + x;
  const wz = chunk.z * CHUNK_SIZE + z;
  const faceX = direction === 1 ? wx + 1 : wx;

  addFaceShared(
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
}

function greedyZAxis(
  chunk: Chunk,
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
        const block = chunk.getBlock(x, y, z);
        const neighbor = chunk.getBlock(x, y, z + direction);

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

        addZFace(
          positions,
          colors,
          indices,
          x,
          y,
          z,
          width,
          height,
          block,
          chunk,
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

function addZFace(
  positions: number[],
  colors: number[],
  indices: number[],
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  block: number,
  chunk: Chunk,
  direction: 1 | -1,
) {
  const wx = chunk.x * CHUNK_SIZE + x;
  const wz = chunk.z * CHUNK_SIZE + z;
  const faceZ = direction === 1 ? wz + 1 : wz;

  addFaceShared(
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
}

function addFaceShared(
  positions: number[],
  colors: number[],
  indices: number[],
  corners: [number, number, number][],
  block: number,
  direction: 1 | -1,
) {
  const color = new THREE.Color(BLOCK_COLORS[block] ?? 0xff00ff);
  const vi = positions.length / 3;

  for (const [x, y, z] of corners) {
    positions.push(x, y, z);
  }

  for (let i = 0; i < 4; i++) {
    colors.push(color.r, color.g, color.b);
  }

  if (direction === 1) {
    indices.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
  } else {
    indices.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
  }
}
