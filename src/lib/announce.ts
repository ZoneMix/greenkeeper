// Screen-reader announcements through one always-mounted polite live region
// (rendered in app/layout.tsx). Content changes are announced; mounting is not.

export const ANNOUNCER_ID = 'announcer';
const RESET_DELAY_MS = 60;

export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  const region = document.getElementById(ANNOUNCER_ID);
  if (!region) return;
  // Clear first so repeating the same message is announced again.
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, RESET_DELAY_MS);
}
