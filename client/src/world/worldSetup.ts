import * as THREE from "three";
import { Chunk } from "./chunk";
import { meshChunk } from "./chunkMesher";
import { World } from "./world";
import { initConnection } from "../network/connection";

export function createWorld(scene: THREE.Scene): World {
  const world = new World();

  initConnection((chunk) => {
    world.addChunk(chunk);
    const mesh = meshChunk(chunk);
    world.meshMap.set(world.getKey(chunk.x, chunk.z), mesh);
    scene.add(mesh);
  });

  return world;
}
