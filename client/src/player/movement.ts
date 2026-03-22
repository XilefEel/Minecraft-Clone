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

  const UP = new THREE.Vector3(0, 1, 0);
  const moveVelocity = new THREE.Vector3();

  return function update() {
    moveVelocity.set(0, 0, 0);

    direction.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    right.crossVectors(direction, UP);

    let speed = CONFIG.player.speed;
    if (keys["ShiftLeft"]) {
      speed *= 2; // sprinting
    }

    if (keys["KeyW"]) moveVelocity.addScaledVector(direction, speed);
    if (keys["KeyS"]) moveVelocity.addScaledVector(direction, -speed);
    if (keys["KeyA"]) moveVelocity.addScaledVector(right, -speed);
    if (keys["KeyD"]) moveVelocity.addScaledVector(right, speed);

    player.velocity.x = moveVelocity.x;
    player.velocity.z = moveVelocity.z;

    // gravity
    player.velocity.y += CONFIG.player.gravity;

    // jump
    if (keys["Space"] && player.isGrounded) {
      player.velocity.y = CONFIG.player.jumpStrength;
    }

    player.update(world);
  };
}
