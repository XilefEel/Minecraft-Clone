import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { CONFIG } from "../config";

export function addGUI() {
  const gui = new GUI();

  const playerFolder = gui.addFolder("Player");
  playerFolder.add(CONFIG.player, "speed", 0.01, 3).name("Walk Speed");
  playerFolder.add(CONFIG.player, "gravity", -0.05, 0, 0.001).name("Gravity");
  playerFolder.add(CONFIG.player, "jumpStrength", 0.01, 1).name("Jump Power");
  playerFolder.add(CONFIG.player, "baseFov", 30, 120).name("Base FOV");
}
