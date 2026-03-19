import * as THREE from "three";
import { meshChunk } from "./chunkMesher";
import { World } from "./world";
import { initConnection } from "../network/connection";
import type { Player } from "../player/player";

export function createWorld(scene: THREE.Scene, player: Player): World {
  const world = new World();

  initConnection(player, scene, (chunk) => {
    world.addChunk(chunk);
    const mesh = meshChunk(chunk);
    world.meshMap.set(world.getKey(chunk.x, chunk.z), mesh);
    scene.add(mesh);
  });

  return world;
}
