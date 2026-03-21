import * as THREE from "three";

const DAY_DURATION = 120000; // 2 minutes

const DAWN_COLOR = new THREE.Color(0xffb74d);
const DAY_COLOR = new THREE.Color(0x87ceeb);
const DUSK_COLOR = new THREE.Color(0xff7043);
const NIGHT_COLOR = new THREE.Color(0x0a0a2a);

let dayTime = 0.4;
let lastTime = Date.now();

function getSkyColor(): THREE.Color {
  if (dayTime < 0.2) {
    return NIGHT_COLOR.clone();
  } else if (dayTime < 0.3) {
    const t = (dayTime - 0.2) / 0.1;
    return NIGHT_COLOR.clone().lerp(DAWN_COLOR, t);
  } else if (dayTime < 0.4) {
    const t = (dayTime - 0.3) / 0.1;
    return DAWN_COLOR.clone().lerp(DAY_COLOR, t);
  } else if (dayTime < 0.7) {
    return DAY_COLOR.clone();
  } else if (dayTime < 0.8) {
    const t = (dayTime - 0.7) / 0.1;
    return DAY_COLOR.clone().lerp(DUSK_COLOR, t);
  } else if (dayTime < 0.9) {
    const t = (dayTime - 0.8) / 0.1;
    return DUSK_COLOR.clone().lerp(NIGHT_COLOR, t);
  } else {
    return NIGHT_COLOR.clone();
  }
}

function getLighting(): {
  sun: number;
  ambient: number;
} {
  // Night (0 - 0.2)
  if (dayTime < 0.2) {
    return { sun: 0, ambient: 0.1 };
  }
  // Sunrise (0.2 - 0.3)
  else if (dayTime < 0.3) {
    const t = (dayTime - 0.2) / 0.1;
    return {
      sun: t * 4,
      ambient: 0.1 + t * 0.8,
    };
  }
  // Day (0.3 - 0.7)
  else if (dayTime < 0.7) {
    const t = (dayTime - 0.3) / 0.4;
    return {
      sun: 3.5 + Math.sin(t * Math.PI) * 0.5,
      ambient: 0.9,
    };
  }
  // Sunset (0.7 - 0.8)
  else if (dayTime < 0.8) {
    const t = (0.8 - dayTime) / 0.1;
    return {
      sun: t * 4,
      ambient: 0.1 + t * 0.8,
    };
  }
  // Night (0.8 - 1)
  else {
    return { sun: 0, ambient: 0.1 };
  }
}

export function updateDayNight(
  sun: THREE.DirectionalLight,
  ambient: THREE.AmbientLight,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
  const now = Date.now();
  dayTime = (dayTime + (now - lastTime) / DAY_DURATION) % 1;
  lastTime = now;

  const skyColor = getSkyColor();
  const lighting = getLighting();
  sun.intensity = lighting.sun;
  ambient.intensity = lighting.ambient;

  const sunAngle = (dayTime - 0.25) * Math.PI * 2;
  sun.position.set(Math.cos(sunAngle) * 200, Math.sin(sunAngle) * 200, 50);
  const sunHeight = Math.sin(sunAngle);

  // 0 = horizon, 1 = overhead
  const h = Math.max(0, sunHeight);

  // warmer near horizon
  sun.color.setHSL(0.08, 0.8, 0.5 + h * 0.4);

  renderer.setClearColor(skyColor);

  scene.background = skyColor.clone();

  scene.fog = new THREE.Fog(
    skyColor.clone().multiplyScalar(0.7).getHex(),
    20,
    100,
  );
}
