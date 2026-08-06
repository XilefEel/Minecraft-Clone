import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { CONFIG } from "../config";

export function addGUI() {
  const gui = new GUI();

  const playerFolder = gui.addFolder("Player");
  playerFolder.add(CONFIG.player, "speed", 1, 100).name("Walk Speed");
  playerFolder.add(CONFIG.player, "gravity", -100, 0).name("Gravity");
  playerFolder.add(CONFIG.player, "jumpStrength", 0.01, 100).name("Jump Power");
  playerFolder.add(CONFIG.player, "baseFov", 30, 120).name("Base FOV");
}
