import * as THREE from "three";
import { CONFIG } from "../config";

export function createScene() {
  const canvas = document.querySelector("#c") as HTMLCanvasElement;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.scene.backgroundColor);
  scene.fog = new THREE.Fog(
    CONFIG.scene.fogColor,
    CONFIG.scene.fogNear,
    CONFIG.scene.fogFar,
  );

  const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    2,
    CONFIG.camera.near,
    CONFIG.camera.far,
  );
  camera.position.set(
    CONFIG.camera.initialPos.x,
    CONFIG.camera.initialPos.y,
    CONFIG.camera.initialPos.z,
  );
  camera.lookAt(
    CONFIG.camera.lookAt.x,
    CONFIG.camera.lookAt.y,
    CONFIG.camera.lookAt.z,
  );
  camera.rotation.order = "YXZ";

  return { canvas, renderer, scene, camera };
}
