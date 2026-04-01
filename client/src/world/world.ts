import * as THREE from "three";
import { Chunk, CHUNK_SIZE } from "./chunk";

export class World {
  chunkMap: Map<number, Chunk> = new Map();
  meshMap: Map<number, THREE.Mesh> = new Map();

  private worker = new Worker(new URL("./webWorker.ts", import.meta.url), {
    type: "module",
  });
  private scene: THREE.Scene;
  private chunkMaterial: THREE.MeshLambertMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.chunkMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
    });

    // listen for worker messages when done meshing
    this.worker.onmessage = (e) => {
      const { posArray, colArray, idxArray, chunkX, chunkZ } = e.data;
      if (!this.chunkMap.has(this.getKey(chunkX, chunkZ))) return;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(posArray, 3),
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colArray, 3),
      );
      geometry.setIndex(new THREE.BufferAttribute(idxArray, 1));

      const mesh = new THREE.Mesh(geometry, this.chunkMaterial);

      const key = this.getKey(chunkX, chunkZ);
      const oldMesh = this.meshMap.get(key);

      if (oldMesh) {
        this.scene.remove(oldMesh);
        oldMesh.geometry.dispose();
      }

      this.meshMap.set(key, mesh);
      this.scene.add(mesh);
    };
  }

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

  remeshAt(x: number, z: number) {
    const cx = this.toChunkCoord(x);
    const cz = this.toChunkCoord(z);
    const chunk = this.chunkMap.get(this.getKey(cx, cz));

    if (chunk) this.remeshChunk(chunk);

    const localX = this.toLocalCoord(x);
    const localZ = this.toLocalCoord(z);

    const neighbors: (Chunk | undefined)[] = [];

    if (localX === 0)
      neighbors.push(this.chunkMap.get(this.getKey(cx - 1, cz)));
    if (localX === CHUNK_SIZE - 1)
      neighbors.push(this.chunkMap.get(this.getKey(cx + 1, cz)));
    if (localZ === 0)
      neighbors.push(this.chunkMap.get(this.getKey(cx, cz - 1)));
    if (localZ === CHUNK_SIZE - 1)
      neighbors.push(this.chunkMap.get(this.getKey(cx, cz + 1)));

    for (const neighbor of neighbors) {
      if (neighbor) this.remeshChunk(neighbor);
    }
  }

  remeshChunk(chunk: Chunk) {
    // p is positive, n is negative
    const neighbors = {
      px:
        this.chunkMap.get(this.getKey(chunk.x + 1, chunk.z))?.blocks.slice() ??
        null,
      nx:
        this.chunkMap.get(this.getKey(chunk.x - 1, chunk.z))?.blocks.slice() ??
        null,
      pz:
        this.chunkMap.get(this.getKey(chunk.x, chunk.z + 1))?.blocks.slice() ??
        null,
      nz:
        this.chunkMap.get(this.getKey(chunk.x, chunk.z - 1))?.blocks.slice() ??
        null,
    };

    // send to worker to mesh (so we don't lag the main thread)
    this.worker.postMessage({
      blocks: chunk.blocks.slice(), // slice to copy the array
      chunkX: chunk.x,
      chunkZ: chunk.z,
      neighbors,
    });
  }

  addChunk(chunk: Chunk) {
    this.chunkMap.set(this.getKey(chunk.x, chunk.z), chunk);
    this.remeshChunk(chunk);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const neighbor = this.chunkMap.get(
        this.getKey(chunk.x + dx, chunk.z + dz),
      );
      if (neighbor) this.remeshChunk(neighbor);
    }
  }

  unloadChunk(x: number, z: number) {
    const key = this.getKey(x, z);
    const mesh = this.meshMap.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.meshMap.delete(key);
    }
    this.chunkMap.delete(key);
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

  isSolid(x: number, y: number, z: number): boolean {
    const block = this.getBlock(x, y, z);
    return block !== 0 && block !== 5; // 0 = air, 5 = water
  }
}
