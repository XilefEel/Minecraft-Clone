import * as THREE from "three";

export function addObjects(scene: THREE.Scene) {
  // plane
  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    "https://threejs.org/manual/examples/resources/images/checker.png",
  );
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(20, 20);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  plane.rotation.x = Math.PI * -0.5;
  scene.add(plane);

  // cube
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) {
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: "#8AC" }),
      );
      cube.position.set(x * 1.1, 1, z * 1.1);
      scene.add(cube);
    }
  }

  // sphere
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(3, 32, 16),
    new THREE.MeshStandardMaterial({ color: "#CA8" }),
  );
  sphere.position.set(-4, 5, 0);
  scene.add(sphere);
}
