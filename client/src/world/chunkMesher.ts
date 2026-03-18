import * as THREE from "three";
import { Chunk, CHUNK_HEIGHT, CHUNK_SIZE } from "./chunk";
import { BLOCK_COLORS } from "./blocks";

const FACES = [
  {
    dir: [0, 1, 0],
    corners: [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
    ],
  }, // top
  {
    dir: [0, -1, 0],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [0, 0, 0],
      [1, 0, 0],
    ],
  }, // bottom
  {
    dir: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 1, 1],
      [1, 0, 0],
      [1, 1, 0],
    ],
  }, // right
  {
    dir: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0, 1, 1],
    ],
  }, // left
  {
    dir: [0, 0, 1],
    corners: [
      [1, 0, 1],
      [0, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  }, // front
  {
    dir: [0, 0, -1],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  }, // back
];

export function meshChunk(chunk: Chunk): THREE.Mesh {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = chunk.getBlock(x, y, z);
        // air
        if (block === 0) continue;

        const color = new THREE.Color(BLOCK_COLORS[block] ?? 0xff00ff);

        for (const { dir, corners } of FACES) {
          const neighbor = chunk.getBlock(x + dir[0], y + dir[1], z + dir[2]);
          if (neighbor !== 0) continue;

          const vertexIndex = positions.length / 3;

          for (const [cx, cy, cz] of corners) {
            positions.push(
              x + cx + chunk.x * CHUNK_SIZE,
              y + cy,
              z + cz + chunk.z * CHUNK_SIZE,
            );
            colors.push(color.r, color.g, color.b);
          }

          indices.push(
            vertexIndex,
            vertexIndex + 2,
            vertexIndex + 1,
            vertexIndex + 2,
            vertexIndex + 3,
            vertexIndex + 1,
          );
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);

  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });

  return new THREE.Mesh(geometry, material);
}
