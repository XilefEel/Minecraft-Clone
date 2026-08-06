const gameKeys = [
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
];

export class InputHandler {
  private keys: Record<string, boolean> = {};
  private lastSpacePress = 0;
  private readonly DOUBLE_TAP_WINDOW = 250;
  private spaceDoubleTapped = false;

  constructor() {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => (this.keys[e.code] = false));
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (gameKeys.includes(e.code) && document.activeElement?.id !== "chat") {
      e.preventDefault();
    }
    if (e.repeat) return;
    this.keys[e.code] = true;

    if (e.code === "Space") {
      const now = Date.now();
      if (now - this.lastSpacePress < this.DOUBLE_TAP_WINDOW) {
        this.spaceDoubleTapped = true;
      }
      this.lastSpacePress = now;
    }
  }

  isPressed(code: string): boolean {
    return !!this.keys[code];
  }

  isChatFocused(): boolean {
    return document.activeElement?.id === "chat";
  }

  consumeSpaceDoubleTap(): boolean {
    if (this.spaceDoubleTapped) {
      this.spaceDoubleTapped = false;
      return true;
    }
    return false;
  }
}
