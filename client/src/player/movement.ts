import * as THREE from "three";
import type { World } from "../world/world";

import { CONFIG } from "../config";
import type { Player } from "./player";

export function initMovement(world: World, player: Player) {
  const keys: Record<string, boolean> = {};
  const direction = new THREE.Vector3();
  const right = new THREE.Vector3();

  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));

  return function update() {
    direction.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0));

    const speed = CONFIG.player.speed;

    if (keys["KeyW"]) player.position.addScaledVector(direction, speed);
    if (keys["KeyS"]) player.position.addScaledVector(direction, -speed);
    if (keys["KeyA"]) player.position.addScaledVector(right, -speed);
    if (keys["KeyD"]) player.position.addScaledVector(right, speed);

    if (keys["Space"] && player.isGrounded) {
      player.velocity.y += CONFIG.player.jumpStrength;
      player.isGrounded = false;
    }

    player.velocity.y += CONFIG.player.gravity;

    const nextY = player.position.y + player.velocity.y;
    const feetY = nextY - 0.05;

    if (world.isSolid(player.position.x, feetY, player.position.z)) {
      player.velocity.y = 0;
      player.isGrounded = true;
    } else {
      player.position.y = nextY;
      player.isGrounded = false;
    }
  };
}
