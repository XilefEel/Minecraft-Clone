import * as THREE from "three";
import { CONFIG } from "../config";
import { CSS2DRenderer } from "three/examples/jsm/Addons.js";

export function createScene() {
  const canvas = document.querySelector("#c") as HTMLCanvasElement;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
    `;
  document.body.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.scene.backgroundColor);

  const camera = new THREE.PerspectiveCamera(
    CONFIG.player.baseFov,
    2,
    CONFIG.camera.near,
    CONFIG.camera.far,
  );

  return { canvas, renderer, scene, camera, labelRenderer };
}
