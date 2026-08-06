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
    this.handleFlightToggle();
    this.handleSneakState();
    this.handleSprintState();

    const speed = this.calculateSpeed(deltaTime);

    this.applyMovement(speed);
    this.applyJumpAndFly(speed);
    this.applyGravity(deltaTime);
    this.applyKnockback(deltaTime);

    this.player.update(this.world, deltaTime);
  }

  private handleFlightToggle() {
    if (this.input.consumeSpaceDoubleTap()) {
      this.player.isFlying = !this.player.isFlying;
    }
  }

  private handleSneakState() {
    const wantsToSneak =
      (this.input.isPressed("ShiftLeft") ||
        this.input.isPressed("ShiftRight")) &&
      !this.player.isFlying;

    if (this.player.isSneaking && !wantsToSneak) {
      if (this.player.canStand(this.world)) this.player.isSneaking = false;
    } else {
      this.player.isSneaking = wantsToSneak;
    }
  }

  private handleSprintState() {
    const isMoving =
      this.input.isPressed("KeyW") ||
      this.input.isPressed("KeyA") ||
      this.input.isPressed("KeyS") ||
      this.input.isPressed("KeyD");

    this.player.isSprinting =
      (this.input.isPressed("ControlLeft") ||
        this.input.isPressed("ControlRight")) &&
      isMoving &&
      !this.player.isSneaking;
  }

  private calculateSpeed(dt: number): number {
    let speed = this.player.isFlying
      ? CONFIG.player.flyingSpeed
      : CONFIG.player.speed;

    if (this.player.isSprinting) {
      speed *= CONFIG.player.sprintSpeedMultiplier;
    } else if (this.player.isSneaking) {
      speed *= CONFIG.player.sneakSpeedMultiplier;
    }

    if (this.player.isFlying) {
      const speedLerp = 1 - Math.exp(-6 * dt);
      this.currentSpeed += (speed - this.currentSpeed) * speedLerp;
    } else {
      this.currentSpeed = speed;
    }

    return this.currentSpeed;
  }

  private applyMovement(speed: number) {
    this.direction.set(
      -Math.sin(this.player.yaw),
      0,
      -Math.cos(this.player.yaw),
    );
    this.right.crossVectors(this.direction, this.UP);

    this.moveVelocity.set(0, 0, 0);

    if (this.input.isChatFocused()) return;

    if (this.input.isPressed("KeyW")) this.moveVelocity.add(this.direction);
    if (this.input.isPressed("KeyS")) this.moveVelocity.sub(this.direction);
    if (this.input.isPressed("KeyA")) this.moveVelocity.sub(this.right);
    if (this.input.isPressed("KeyD")) this.moveVelocity.add(this.right);

    this.moveVelocity.normalize().multiplyScalar(speed);
  }

  private applyJumpAndFly(speed: number) {
    if (this.input.isChatFocused()) return;

    if (this.player.isFlying) {
      this.player.velocity.y = 0;

      const up = this.input.isPressed("Space");
      const down =
        this.input.isPressed("ShiftLeft") || this.input.isPressed("ShiftRight");

      if (up && !down) this.player.velocity.y = speed;
      if (down && !up) this.player.velocity.y = -speed;
    } else if (this.input.isPressed("Space") && this.player.isGrounded) {
      this.player.velocity.y = CONFIG.player.jumpStrength;
    }
  }

  private applyGravity(deltaTime: number) {
    if (!this.player.isFlying) {
      this.player.velocity.y += CONFIG.player.gravity * deltaTime;
    } else if (this.input.isChatFocused()) {
      this.player.velocity.y = 0;
    }
  }

  private applyKnockback(deltaTime: number) {
    this.player.velocity.x = this.moveVelocity.x + this.player.knockback.x;
    this.player.velocity.z = this.moveVelocity.z + this.player.knockback.z;

    const knockbackDecay = Math.pow(0.1, deltaTime);
    this.player.knockback.multiplyScalar(knockbackDecay);
  }
}
