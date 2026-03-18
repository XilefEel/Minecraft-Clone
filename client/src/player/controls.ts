import * as THREE from "three";
import type { World } from "../world/world";

export function initPointerLock(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
) {
  let yaw = 0;
  let pitch = 0;

  canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;

    const sensitivity = 0.0025;
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;

    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
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

      console.log(`Block coordinates: (${blockX}, ${blockY}, ${blockZ})`);

      const chunk = world.setBlock(blockX, blockY, blockZ, 0);
      if (!chunk) return;

      world.remeshChunk(chunk, scene);
    }
  });
}
