import * as THREE from "three";
import type { World } from "../world/world";

export class Player {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number = 0;
  pitch: number = 0;
  isGrounded = false;

  readonly width = 0.4;
  readonly height = 1.8;
  readonly eyeHeight = 1.6;

  constructor(x: number, y: number, z: number) {
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(0, 0, 0);
  }

  private getSolidBlock(world: World): THREE.Vector3 | null {
    const { min, max } = this.getBoundingBox();

    for (let x = Math.floor(min.x); x <= Math.floor(max.x); x++) {
      for (let y = Math.floor(min.y); y <= Math.floor(max.y); y++) {
        for (let z = Math.floor(min.z); z <= Math.floor(max.z); z++) {
          if (world.isSolid(x, y, z)) {
            return new THREE.Vector3(x, y, z);
          }
        }
      }
    }

    return null;
  }

  getCameraPosition() {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z,
    );
  }

  getBoundingBox() {
    const hw = this.width / 2;
    return {
      min: new THREE.Vector3(
        this.position.x - hw,
        this.position.y,
        this.position.z - hw,
      ),
      max: new THREE.Vector3(
        this.position.x + hw,
        this.position.y + this.height,
        this.position.z + hw,
      ),
    };
  }

  update(world: World) {
    // X Axis
    this.position.x += this.velocity.x;
    if (this.getSolidBlock(world)) {
      this.position.x -= this.velocity.x;
      this.velocity.x = 0;
    }

    // Z Axis
    this.position.z += this.velocity.z;
    if (this.getSolidBlock(world)) {
      this.position.z -= this.velocity.z;
      this.velocity.z = 0;
    }

    // Y Axis
    this.position.y += this.velocity.y;
    const yCollision = this.getSolidBlock(world);
    if (yCollision) {
      this.position.y -= this.velocity.y;
      if (this.velocity.y < 0) {
        this.isGrounded = true;
      }
      this.velocity.y = 0;
    } else {
      this.isGrounded = false;
    }
  }
}
