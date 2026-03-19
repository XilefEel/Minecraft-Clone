import * as THREE from "three";
import type { Player } from "./player";
import { Connection } from "../network/connection";

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

export function initRaycast(
  connection: Connection,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const raycaster = new THREE.Raycaster();

  window.addEventListener("mousedown", (e) => {
    if (document.pointerLockElement === null) return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const normal = intersects[0].face!.normal!;

      if (e.button === 0) {
        // left click — break
        const blockX = Math.floor(point.x - normal.x * 0.5);
        const blockY = Math.floor(point.y - normal.y * 0.5);
        const blockZ = Math.floor(point.z - normal.z * 0.5);

        // send block break to server
        connection.sendEvent({
          type: "BlockBreak",
          x: blockX,
          y: blockY,
          z: blockZ,
        });
      } else if (e.button === 2) {
        // right click — place
        const blockX = Math.floor(point.x + normal.x * 0.5);
        const blockY = Math.floor(point.y + normal.y * 0.5);
        const blockZ = Math.floor(point.z + normal.z * 0.5);

        // send block break to server
        connection.sendEvent({
          type: "BlockPlace",
          x: blockX,
          y: blockY,
          z: blockZ,
          block_id: 1,
        });
      }
    }
  });
}
