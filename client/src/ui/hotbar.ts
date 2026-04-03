const BLOCKS = [
  { id: 1, name: "Grass", color: "#5b8a3c" },
  { id: 2, name: "Stone", color: "#7d7d7d" },
  { id: 3, name: "Dirt", color: "#8b5e3c" },
  { id: 4, name: "Bedrock", color: "#2d2d2d" },
  // { id: 5, name: "Water", color: "#3d6fd4" },
  { id: 6, name: "Sand", color: "#d4bc7a" },
  { id: 7, name: "Snow", color: "#dce8e8" },
  { id: 8, name: "Log", color: "#6b4226" },
  { id: 9, name: "Oak Leaves", color: "#2d6e1e" },
];

let selectedBlock = 0;

export function createHotbar() {
  const hotbar = document.createElement("div");
  hotbar.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      pointer-events: none;
    `;

  const slots = BLOCKS.map((block, i) => {
    const slot = document.createElement("div");
    slot.style.cssText = `
        width: 48px;
        height: 48px;
        border: 2px solid ${i === 0 ? "white" : "rgba(255, 255, 255, 0.3)"};
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      `;

    const inner = document.createElement("div");
    inner.style.cssText = `
        width: 32px;
        height: 32px;
        background: ${block.color};
        border-radius: 2px;
      `;

    slot.appendChild(inner);
    hotbar.appendChild(slot);
    return slot;
  });

  document.body.appendChild(hotbar);

  // keyboard selection
  window.addEventListener("keydown", (e) => {
    const num = parseInt(e.key);
    if (num >= 1 && num <= BLOCKS.length) {
      slots[selectedBlock].style.borderColor = "rgba(255, 255, 255, 0.3)";
      selectedBlock = num - 1;
      slots[selectedBlock].style.borderColor = "white";
    }
  });

  // scrollwheel
  window.addEventListener("wheel", (e) => {
    slots[selectedBlock].style.borderColor = "rgba(255, 255, 255, 0.3)";
    selectedBlock =
      (selectedBlock + (e.deltaY > 0 ? 1 : -1) + BLOCKS.length) % BLOCKS.length;
    slots[selectedBlock].style.borderColor = "white";
  });
}

export function getSelectedBlock(): number {
  return BLOCKS[selectedBlock].id;
}

let healthBarFill: HTMLDivElement;
let healthText: HTMLDivElement;

export function createHealthBar() {
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    bottom: 72px;
    left: calc(50% - 220px);
    pointer-events: none;
  `;

  healthText = document.createElement("div");
  healthText.style.cssText = `
    color: white;
    font-family: monospace;
    font-size: 14px;
    margin-bottom: 4px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 6px;
    padding: 0px 6px;
    width: 40px;
    text-align: center;
  `;
  healthText.textContent = "20/20";

  const healthBar = document.createElement("div");
  healthBar.style.cssText = `
    width: 200px;
    height: 12px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 6px;
    overflow: hidden;
  `;

  healthBarFill = document.createElement("div");
  healthBarFill.style.cssText = `
    width: 100%;
    height: 100%;
    background: #e74c3c;
    border-radius: 6px;
    transition: width 0.2s ease;
  `;

  healthBar.appendChild(healthBarFill);
  container.appendChild(healthText);
  container.appendChild(healthBar);
  document.body.appendChild(container);
}

export function updateHealthBar(health: number) {
  if (!healthBarFill) return;
  const healthPercentage = (health / 20) * 100;

  healthText.textContent = `${health}/20`;
  healthBarFill.style.width = `${healthPercentage}%`;
}
