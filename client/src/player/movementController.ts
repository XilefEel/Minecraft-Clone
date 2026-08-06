import * as THREE from "three";
import type { World } from "../world/world";
import { CONFIG } from "../config";
import type { Player } from "./player";
import type { InputHandler } from "./input";

export class MovementController {
  private direction = new THREE.Vector3();
  private right = new THREE.Vector3();
  private readonly UP = new THREE.Vector3(0, 1, 0);
  private moveVelocity = new THREE.Vector3();
  private currentSpeed = CONFIG.player.speed;

  private world: World;
  private player: Player;
  private input: InputHandler;

  constructor(world: World, player: Player, input: InputHandler) {
    this.world = world;
    this.player = player;
    this.input = input;
  }

  update(deltaTime: number) {
    const player = this.player;
    const input = this.input;

    if (input.consumeSpaceDoubleTap()) {
      player.isFlying = !player.isFlying;
    }

    this.direction.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    this.right.crossVectors(this.direction, this.UP);

    const isMoving =
      input.isPressed("KeyW") ||
      input.isPressed("KeyS") ||
      input.isPressed("KeyA") ||
      input.isPressed("KeyD");

    const isChatFocused = input.isChatFocused();

    const wantsToSneak =
      (input.isPressed("ShiftLeft") || input.isPressed("ShiftRight")) &&
      !player.isFlying;

    if (player.isSneaking && !wantsToSneak) {
      if (player.canStand(this.world)) player.isSneaking = false;
    } else {
      player.isSneaking = wantsToSneak;
    }

    player.isSprinting =
      (input.isPressed("ControlLeft") || input.isPressed("ControlRight")) &&
      isMoving &&
      !player.isSneaking;

    let speed = player.isFlying
      ? CONFIG.player.flyingSpeed
      : CONFIG.player.speed;

    if (player.isSprinting) {
      speed *= CONFIG.player.sprintSpeedMultiplier;
    } else if (player.isSneaking) {
      speed *= CONFIG.player.sneakSpeedMultiplier;
    }

    if (player.isFlying) {
      const speedLerp = 1 - Math.exp(-6 * deltaTime);
      this.currentSpeed += (speed - this.currentSpeed) * speedLerp;
    } else {
      this.currentSpeed = speed;
    }

    this.moveVelocity.set(0, 0, 0);
    if (!isChatFocused) {
      if (input.isPressed("KeyW")) this.moveVelocity.add(this.direction);
      if (input.isPressed("KeyS")) this.moveVelocity.sub(this.direction);
      if (input.isPressed("KeyA")) this.moveVelocity.sub(this.right);
      if (input.isPressed("KeyD")) this.moveVelocity.add(this.right);

      this.moveVelocity.normalize().multiplyScalar(this.currentSpeed);

      if (player.isFlying) {
        player.velocity.y = 0;
        if (input.isPressed("Space")) player.velocity.y = this.currentSpeed;
        if (input.isPressed("ShiftLeft") || input.isPressed("ShiftRight"))
          player.velocity.y = -this.currentSpeed;
      } else if (input.isPressed("Space") && player.isGrounded) {
        player.velocity.y = CONFIG.player.jumpStrength;
      }
    }

    // gravity
    if (!player.isFlying) {
      player.velocity.y += CONFIG.player.gravity * deltaTime;
    } else if (isChatFocused) {
      player.velocity.y = 0;
    }

    player.velocity.x = this.moveVelocity.x + player.knockback.x;
    player.velocity.z = this.moveVelocity.z + player.knockback.z;

    const knockbackDecay = Math.pow(0.1, deltaTime);
    player.knockback.multiplyScalar(knockbackDecay);

    player.update(this.world, deltaTime);
  }
}
