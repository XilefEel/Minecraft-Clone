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
    const hw = this.width / 2;
    const e = 0.001; // epsilon

    // X Axis
    this.position.x += this.velocity.x;
    const xCollision = this.getSolidBlock(world);

    if (xCollision) {
      if (xCollision.x >= this.position.x) {
        // right
        this.position.x = xCollision.x - hw - e;
      } else {
        // left
        this.position.x = xCollision.x + 1 + hw + e;
      }
      this.velocity.x = 0;
    }

    // Z Axis
    this.position.z += this.velocity.z;
    const zCollision = this.getSolidBlock(world);

    if (zCollision) {
      if (zCollision.z >= this.position.z) {
        // front
        this.position.z = zCollision.z - hw - e;
      } else {
        // back
        this.position.z = zCollision.z + 1 + hw + e;
      }
      this.velocity.z = 0;
    }

    // Y Axis
    this.position.y += this.velocity.y;
    const yCollision = this.getSolidBlock(world);

    if (yCollision) {
      if (this.velocity.y < 0) {
        // top
        this.position.y = yCollision.y + 1 + e;
        this.isGrounded = true;
      } else {
        // bottom
        this.position.y = yCollision.y - this.height - e;
      }
      this.velocity.y = 0;
    } else {
      this.isGrounded = false;
    }
  }
}
