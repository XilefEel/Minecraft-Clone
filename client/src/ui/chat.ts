import type { Connection } from "../network/connection";

const container = document.createElement("div");
container.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 3%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    pointer-events: none;
`;
document.body.appendChild(container);

export function sendChat(text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
      color: white;
      font-family: monospace;
      font-size: 16px;
      background: rgba(0, 0, 0, 0.5);
      padding: 4px 12px;
      border-radius: 4px;
      opacity: 1;
      transition: opacity 1s;
    `;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 1000);
  }, 6000);
}

const chatInput = document.getElementById("chat") as HTMLInputElement;

export function initChat(connection: Connection, canvas: HTMLCanvasElement) {
  window.addEventListener("keydown", (e) => {
    if (
      (e.code === "KeyT" || e.code === "Slash") &&
      document.pointerLockElement !== null
    ) {
      e.preventDefault();
      document.exitPointerLock();
      chatInput.style.display = "block";
      chatInput.focus();
    }

    if (e.code === "Escape") hideChat(canvas);

    if (e.code === "Enter" && document.activeElement === chatInput) {
      const message = chatInput.value.trim();
      if (message) connection.sendEvent({ type: "ChatMessage", message });

      hideChat(canvas);
    }

    canvas.addEventListener("click", () => {
      if (chatInput.style.display === "block") hideChat(canvas);
    });
  });
}

function hideChat(canvas: HTMLCanvasElement) {
  chatInput.style.display = "none";
  chatInput.value = "";
  canvas.requestPointerLock();
}
