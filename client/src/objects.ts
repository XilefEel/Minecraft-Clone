import * as THREE from "three";
import { Chunk } from "./chunk";
import { meshChunk } from "./chunkMesher";
import { World } from "./world";

const WORLD_SIZE = 4;

export function addObjects(scene: THREE.Scene): World {
  const world = new World();

  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      const chunk = new Chunk(x, z);
      chunk.fill();
      world.addChunk(chunk);  
      scene.add(meshChunk(chunk));
    }
  }

  return world;
}
