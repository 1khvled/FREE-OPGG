/**
 * Overlay hotkeys.
 *
 * The reference's own conventions:
 *
 *   Shift+Tab      lock / unlock the HUD (toggle whether it steals the mouse)
 *   Ctrl+Shift+O   show / hide the overlay entirely
 *
 * The keys are handled locally when the overlay window has focus. The main
 * process may also own global shortcuts; when it does, it forwards the same
 * two actions through the optional preload helpers below.
 */
export function installHotkeys(actions) {
  const onKeyDown = (event) => {
    if (event.defaultPrevented) return;
    const key = event.key;
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey;
    const alt = event.altKey;
    const meta = event.metaKey;

    if (key === 'Tab' && shift && !ctrl && !alt && !meta) {
      event.preventDefault();
      actions.toggleInteractive();
      return;
    }

    if (ctrl && shift && !alt && !meta && (key === 'O' || key === 'o')) {
      event.preventDefault();
      actions.toggleVisible();
    }
  };

  window.addEventListener('keydown', onKeyDown, true);

  /* Optional main-process forwarded hotkeys. */
  const offs = [];
  const api = typeof window !== 'undefined' ? window.opgg : null;
  if (api && typeof api.onOverlayInteractiveToggle === 'function') {
    const off = api.onOverlayInteractiveToggle(() => actions.toggleInteractive());
    if (typeof off === 'function') offs.push(off);
  }
  if (api && typeof api.onOverlayToggleVisible === 'function') {
    const off = api.onOverlayToggleVisible(() => actions.toggleVisible());
    if (typeof off === 'function') offs.push(off);
  }

  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    for (const off of offs) {
      try {
        off();
      } catch {
        /* unsubscribe must never throw */
      }
    }
  };
}
