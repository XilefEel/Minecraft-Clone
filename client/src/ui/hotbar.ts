const BLOCKS = [
  { id: 1, name: "Grass", color: "#5b8a3c" },
  { id: 2, name: "Stone", color: "#7d7d7d" },
  { id: 3, name: "Dirt", color: "#8b5e3c" },
  { id: 4, name: "Bedrock", color: "#2d2d2d" },
  // { id: 5, name: "Water", color: "#3d6fd4" },
  { id: 6, name: "Sand", color: "#d4bc7a" },
  { id: 7, name: "Snow", color: "#dce8e8" },
  { id: 8, name: "Log", color: "#6b4226" },
  { id: 9, name: "Leaves", color: "#2d6e1e" },
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
