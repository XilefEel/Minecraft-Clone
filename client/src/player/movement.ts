import * as THREE from "three";
import type { World } from "../world/world";

import { CONFIG } from "../config";

export function initMovement(world: World, camera: THREE.Camera) {
  const keys: Record<string, boolean> = {};
  const direction = new THREE.Vector3();
  const right = new THREE.Vector3();
  let velocityY = 0;
  let onGround = false;

  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));

  return function update() {
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    right.crossVectors(direction, camera.up);

    const currentSpeed = keys["ShiftLeft"]
      ? CONFIG.player.speed / 3
      : CONFIG.player.speed;

    if (keys["KeyW"]) camera.position.addScaledVector(direction, currentSpeed);
    if (keys["KeyS"]) camera.position.addScaledVector(direction, -currentSpeed);
    if (keys["KeyA"]) camera.position.addScaledVector(right, -currentSpeed);
    if (keys["KeyD"]) camera.position.addScaledVector(right, currentSpeed);

    if (keys["Space"] && onGround) {
      velocityY = CONFIG.player.jumpStrength;
      onGround = false;
    }

    velocityY += CONFIG.player.gravity;

    const nextY = camera.position.y + velocityY;
    const feetY = nextY - CONFIG.player.height;

    if (world.isSolid(camera.position.x, feetY, camera.position.z)) {
      camera.position.y = Math.floor(feetY + 1) + CONFIG.player.height;
      velocityY = 0;
      onGround = true;
    } else {
      camera.position.y = nextY;
      onGround = false;
    }
  };
}
