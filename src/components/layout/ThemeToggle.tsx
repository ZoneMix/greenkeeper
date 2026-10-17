'use client';

import { useSyncExternalStore } from 'react';
import { Icon } from '../ui/Icon';

const STORAGE_KEY = 'theme';

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

const isDark = (): boolean => document.documentElement.classList.contains('dark');

/** Switches day/night. The initial theme is set before paint by the inline script in layout.tsx. */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle(): void {
    const next = !isDark();
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Private mode or storage disabled: the choice lasts for this page only.
    }
  }

  return (
    <button
      type="button"
      className="icon-btn theme-btn"
      onClick={toggle}
      aria-pressed={dark}
      aria-label="Night theme"
      title={dark ? 'Night theme on' : 'Night theme off'}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}

/** Runs before first paint: stored choice, else the OS preference. */
export const THEME_INIT_SCRIPT = `(function(){var t=null;try{t=localStorage.getItem("${STORAGE_KEY}")}catch(e){}if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(t==="dark")document.documentElement.classList.add("dark")})();`;
