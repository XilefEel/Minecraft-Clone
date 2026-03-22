const container = document.createElement("div");
container.style.cssText = `
    position: fixed;
    bottom: 40px;
    left: 3%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
  `;
document.body.appendChild(container);

export function notify(text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
      color: white;
      font-family: monospace;
      font-size: 13px;
      background: rgba(0,0,0,0.5);
      padding: 4px 12px;
      border-radius: 4px;
      opacity: 1;
      transition: opacity 1s;
    `;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 1000);
  }, 3000);
}
