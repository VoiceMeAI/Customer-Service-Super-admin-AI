/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the Next.js server process starts — before any
 * page is compiled or rendered.
 *
 * WHY THIS EXISTS
 * ───────────────
 * Next.js 15.2+ passes `--localstorage-file` to Node.js to enable a dev-mode
 * "persistent localStorage" feature.  When the flag is provided with an
 * invalid or empty path (which is what Next.js does in most setups), Node.js
 * 22 still creates a `localStorage` global on `globalThis` — but in a broken
 * state where `localStorage.getItem` / `setItem` / `removeItem` are NOT
 * callable functions.
 *
 * Any code (including Zustand's persist middleware, third-party libraries, or
 * our own utilities) that calls `localStorage.getItem(...)` on the server
 * therefore crashes with:
 *
 *   TypeError: localStorage.getItem is not a function
 *
 * …and Next.js returns HTTP 500 for every page.
 *
 * THE FIX
 * ───────
 * We detect the broken `localStorage` object (exists but methods are not
 * functions) and replace it with a safe no-op shim BEFORE any request handler
 * or module initialiser runs.  Server-side code then gets `null` / void
 * instead of a crash.  Real browser `localStorage` in the client bundle is
 * unaffected — `instrumentation.ts` only runs on the server.
 */
export function register() {
  // Only patch in the Node.js runtime (not edge).
  // `globalThis.localStorage` is the broken shim created by --localstorage-file.
  if (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as Record<string, unknown>).localStorage !== 'undefined' &&
    typeof ((globalThis as Record<string, unknown>).localStorage as Record<string, unknown>)
      .getItem !== 'function'
  ) {
    // Replace the broken shim with a safe no-op implementation.
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (_key: string): null => null,
      setItem: (_key: string, _value: string): void => undefined,
      removeItem: (_key: string): void => undefined,
      clear: (): void => undefined,
      key: (_index: number): null => null,
      length: 0,
    };
  }
}
