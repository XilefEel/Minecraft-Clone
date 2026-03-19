import * as THREE from "three";
import type { World } from "../world/world";
import type { Player } from "./player";

export function initPointerLock(canvas: HTMLCanvasElement, player: Player) {
  canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;

    const sensitivity = 0.0025;
    player.yaw -= e.movementX * sensitivity;
    player.pitch -= e.movementY * sensitivity;
    player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
  });
}

export function addRaycast(
  world: World,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  window.addEventListener("mousedown", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const normal = intersects[0].face!.normal!;

      const blockX = Math.floor(point.x - normal.x * 0.5);
      const blockY = Math.floor(point.y - normal.y * 0.5);
      const blockZ = Math.floor(point.z - normal.z * 0.5);

      const chunk = world.setBlock(blockX, blockY, blockZ, 0);
      if (!chunk) return;

      world.remeshChunk(chunk, scene);
    }
  });
}
