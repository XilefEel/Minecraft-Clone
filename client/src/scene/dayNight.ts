import * as THREE from "three";

const DAY_DURATION = 1_200_000; // 20 minutes

const DAWN_COLOR = new THREE.Color(0xffb74d);
const DAY_COLOR = new THREE.Color(0x87ceeb);
const DUSK_COLOR = new THREE.Color(0xff7043);
const NIGHT_COLOR = new THREE.Color(0x0a0a2a);

let dayCounter = 0;
let dayTime = 0;
let lastTime = Date.now();

// Night (0 - 0.2)
// Sunrise (0.2 - 2.5 - 0.3)
// Day (0.3 - 0.7)
// Sunset (0.7 - 0.75 -  0.8)
// Night (0.8 - 1)

export function receiveServerTime(world_time: number) {
  const duration = 1_200;
  console.log("Received world time:", world_time);
  console.log("Client time", dayTime);
  dayTime = (world_time / duration) % 1.0;
  dayCounter = Math.floor(world_time / duration) + 1;
  console.log("Synced time:", dayTime);
}

function getSkyColor(): THREE.Color {
  // Night (0 - 0.2)
  if (dayTime < 0.2) {
    return NIGHT_COLOR.clone();
  }
  // Night - Sunrise (0.2 - 0.25)
  else if (dayTime < 0.25) {
    const t = (dayTime - 0.2) / 0.05;
    return NIGHT_COLOR.clone().lerp(DAWN_COLOR, t);
  }
  // Sunrise - Day (0.25 - 0.3)
  else if (dayTime < 0.3) {
    const t = (dayTime - 0.25) / 0.05;
    return DAWN_COLOR.clone().lerp(DAY_COLOR, t);
  }
  // Day (0.3 - 0.7)
  else if (dayTime < 0.7) {
    return DAY_COLOR.clone();
  }
  // Day - Sunset (0.7 - 0.75)
  else if (dayTime < 0.75) {
    const t = (dayTime - 0.7) / 0.05;
    return DAY_COLOR.clone().lerp(DUSK_COLOR, t);
  }
  // Sunset - Night (0.75 - 0.8)
  else if (dayTime < 0.8) {
    const t = (dayTime - 0.75) / 0.05;
    return DUSK_COLOR.clone().lerp(NIGHT_COLOR, t);
  }
  // Night (0.8 - 1)
  else {
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
    400,
  );
}
export function getDayCounter(): number {
  return dayCounter;
}

export function getDayTimeString(): string {
  const totalHours = dayTime * 24;
  const hours = Math.floor(totalHours);
  const minutes = Math.floor((totalHours - hours) * 60);
  const ampm = hours < 12 ? "AM" : "PM";

  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes.toString().padStart(2, "0");

  const timeOfDay =
    dayTime < 0.2
      ? "Night"
      : dayTime < 0.3
        ? "Dawn"
        : dayTime < 0.7
          ? "Day"
          : dayTime < 0.8
            ? "Dusk"
            : "Night";

  return `${displayHours}:${displayMinutes} ${ampm} - ${timeOfDay}`;
}
