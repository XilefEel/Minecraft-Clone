import * as THREE from "three";

export function addRaycast(scene: THREE.Scene, camera: THREE.Camera) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  window.addEventListener("click", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(Math.random() * 0xffffff);
    }
  });
}

export function initPointerLock(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
) {
  let yaw = 0;
  let pitch = 0;

  canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      console.log("pointer locked");
    } else {
      console.log("pointer unlocked");
    }
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;

    const sensitivity = 0.0025;
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;

    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  });
}
export function initMovement(
  camera: THREE.Camera,
  speed: number = 0.1,
  gravity: number = -0.02,
  jumpStrength: number = 0.3,
) {
  const keys: Record<string, boolean> = {};
  const direction = new THREE.Vector3();
  const right = new THREE.Vector3();
  let velocityY = 0;
  let onGround = false;

  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));

  return function update() {
    // horizontal movement
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    right.crossVectors(direction, camera.up);

    const currentSpeed = keys["ShiftLeft"] ? speed / 3 : speed;

    if (keys["KeyW"]) camera.position.addScaledVector(direction, currentSpeed);
    if (keys["KeyS"]) camera.position.addScaledVector(direction, -currentSpeed);
    if (keys["KeyA"]) camera.position.addScaledVector(right, -currentSpeed);
    if (keys["KeyD"]) camera.position.addScaledVector(right, currentSpeed);

    // gravity
    velocityY += gravity;
    camera.position.y += velocityY;

    if (camera.position.y <= 4.01) {
      camera.position.y = 4;
      velocityY = 0;
      onGround = true;
    } else {
      onGround = false;
    }

    if (keys["Space"] && onGround) {
      velocityY = jumpStrength;
    }
  };
}
