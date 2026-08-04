/** Storage key mirroring the persisted theme so it can be applied before paint. */
export const THEME_STORAGE_KEY = "budgetly.theme";

const SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark"&&t!=="system")t="system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

/**
 * Applies the saved theme before first paint.
 *
 * The authoritative theme lives in IndexedDB with the rest of the settings, but
 * IndexedDB is async — this mirror in `localStorage` avoids a flash of the wrong
 * theme on load.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
