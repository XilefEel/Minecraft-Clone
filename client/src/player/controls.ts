import * as THREE from "three";
import type { Player } from "./player";
import { Connection } from "../network/connection";
import { getSelectedBlock } from "../ui/hotbar";
import { CONFIG } from "../config";

export function initPointerLock(canvas: HTMLCanvasElement, player: Player) {
  canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;

    player.yaw -= e.movementX * CONFIG.player.sensitivity;
    player.pitch -= e.movementY * CONFIG.player.sensitivity;
    player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
  });
}

export function initBlockInteraction(
  connection: Connection,
  scene: THREE.Scene,
  camera: THREE.Camera,
  player: Player,
) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = 6;

  const CENTER = new THREE.Vector2(0, 0);

  window.addEventListener("mousedown", (e) => {
    if (document.pointerLockElement === null) return;

    raycaster.setFromCamera(CENTER, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const normal = intersects[0].face!.normal!;

      if (e.button === 0) {
        // left click — break
        const { blockX, blockY, blockZ } = getBlockPos(point, normal, -1);

        // send block break to server
        connection.sendEvent({
          type: "BlockBreak",
          x: blockX,
          y: blockY,
          z: blockZ,
        });
      } else if (e.button === 2) {
        const { blockX, blockY, blockZ } = getBlockPos(point, normal, 1);

        const overlapsWithAnyPlayer = [
          {
            position: player.position,
            width: player.width,
            height: player.height,
          },
          ...connection.getRemotePlayerPositions(),
        ].some(({ position, width, height }) => {
          return overlapsBlock(position, width, height, blockX, blockY, blockZ);
        });

        if (!overlapsWithAnyPlayer) {
          connection.sendEvent({
            type: "BlockPlace",
            x: blockX,
            y: blockY,
            z: blockZ,
            block_id: getSelectedBlock(),
          });
        }
      }
    }
  });
}

function overlapsBlock(
  position: THREE.Vector3,
  width: number,
  height: number,
  bx: number,
  by: number,
  bz: number,
): boolean {
  const hw = width / 2;
  return (
    bx < position.x + hw &&
    bx + 1 > position.x - hw &&
    by < position.y + height &&
    by + 1 > position.y &&
    bz < position.z + hw &&
    bz + 1 > position.z - hw
  );
}

function getBlockPos(
  point: THREE.Vector3,
  normal: THREE.Vector3,
  direction: 1 | -1,
) {
  return {
    blockX: Math.floor(point.x + normal.x * 0.5 * direction),
    blockY: Math.floor(point.y + normal.y * 0.5 * direction),
    blockZ: Math.floor(point.z + normal.z * 0.5 * direction),
  };
}
