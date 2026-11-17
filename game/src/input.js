// HALCYON BAY — input.js
// One job: keyboard + mouse state. The main loop reads `keys` and `pressed`
// (edge-triggered actions); nothing else touches listeners.
export function createInput() {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, clicked: false },
    get up() { return this.keys.has('KeyW') || this.keys.has('ArrowUp'); },
    get down() { return this.keys.has('KeyS') || this.keys.has('ArrowDown'); },
    get left() { return this.keys.has('KeyA') || this.keys.has('ArrowLeft'); },
    get right() { return this.keys.has('KeyD') || this.keys.has('ArrowRight'); },
    get handbrake() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); },
  };
  const down = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  };
  const up = (e) => input.keys.delete(e.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => input.keys.clear());
  window.addEventListener('mousedown', (e) => { input.mouse.clicked = true; input.mouse.x = e.clientX; input.mouse.y = e.clientY; });
  window.addEventListener('mouseup', () => { input.mouse.clicked = false; });
  input.consume = (code) => {
    const had = input.pressed.has(code);
    if (had) input.pressed.delete(code);
    return had;
  };
  // Garage menu shortcut: returns 1, 2 or 3 when that number key was pressed
  // this frame (0 otherwise). Used by the garage panel for keyboard buying.
  input.numberPressed = () => {
    for (const n of [1, 2, 3]) {
      if (input.pressed.has('Digit' + n) || input.pressed.has('Numpad' + n)) {
        input.pressed.delete('Digit' + n);
        input.pressed.delete('Numpad' + n);
        return n;
      }
    }
    return 0;
  };
  input.endFrame = () => input.pressed.clear();
  return input;
}
