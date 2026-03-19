import * as THREE from "three";

export class Player {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number = 0;
  pitch: number = 0;
  isGrounded = false;

  readonly width = 0.6;
  readonly height = 1.8;
  readonly eyeHeight = 1.6;

  constructor(x: number, y: number, z: number) {
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(0, 0, 0);
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

  update() {}
}
