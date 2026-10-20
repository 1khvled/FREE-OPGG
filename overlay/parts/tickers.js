/**
 * Low-frequency tickers.
 *
 * The overlay must be cheap: no per-frame animation loops, and no timer
 * running at all while the HUD is hidden. `createTicker` therefore starts and
 * stops with the HUD's visibility.
 */

/**
 * @param {Function} fn        called with the current epoch milliseconds
 * @param {number}   interval  tick period in milliseconds (default 1000 = 1 Hz)
 */
export function createTicker(fn, interval = 1000) {
  let handle = null;

  return {
    start() {
      if (handle !== null) return;
      handle = window.setInterval(() => fn(Date.now()), interval);
    },
    stop() {
      if (handle === null) return;
      window.clearInterval(handle);
      handle = null;
    },
    get running() {
      return handle !== null;
    },
  };
}

/**
 * A ticker that fires immediately and then on the given interval.
 * Used for the LCU reachability poll, which must not wait a full second
 * before the first answer.
 */
export function createImmediateTicker(fn, interval = 2000) {
  let handle = null;

  const tick = () => fn(Date.now());

  return {
    start() {
      if (handle !== null) return;
      tick();
      handle = window.setInterval(tick, interval);
    },
    stop() {
      if (handle === null) return;
      window.clearInterval(handle);
      handle = null;
    },
    get running() {
      return handle !== null;
    },
  };
}
