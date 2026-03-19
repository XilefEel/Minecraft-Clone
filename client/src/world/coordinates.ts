import { CHUNK_SIZE } from "./chunk";

export interface WorldPos {
  x: number;
  y: number;
  z: number;
}

export interface ChunkPos {
  cx: number;
  cz: number;
}

export interface LocalPos {
  lx: number;
  ly: number;
  lz: number;
}

export function worldToChunk(x: number, z: number): ChunkPos {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  };
}

export function worldToLocal(x: number, y: number, z: number): LocalPos {
  return {
    lx: ((Math.floor(x) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    ly: Math.floor(y),
    lz: ((Math.floor(z) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
  };
}

export function localToWorld(
  cx: number,
  cz: number,
  lx: number,
  ly: number,
  lz: number,
): WorldPos {
  return {
    x: cx * CHUNK_SIZE + lx,
    y: ly,
    z: cz * CHUNK_SIZE + lz,
  };
}
