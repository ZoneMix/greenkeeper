// Inline stroke icons (24px grid). Decorative by default; pass `label` when the icon
// is the only thing conveying meaning.

const PATHS = {
  leaf: 'M5 19c0-8 5-13 14-14-1 9-6 14-14 14Zm0 0 7-7',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  skip: 'M5 12h14M13 6l6 6-6 6',
  alert: 'M12 9v4m0 3.5v.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  pause: 'M9 5v14m6-14v14',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  box: 'm3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4m0-10v10m9-14v10l-9 4',
  cart: 'M3 4h2l2.4 11h10.2L20 8H6.2M10 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'm4 20 4-1 11-11-3-3L5 16l-1 4Zm10-13 3 3',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronDown: 'm6 9 6 6 6-6',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
  thermometer: 'M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7',
  cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z',
  rain: 'M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7Zm1 3-1 3m5-3-1 3m5-3-1 3',
  snow: 'M7 14h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7a3.5 3.5 0 0 0 1 7Zm1 4h.01M12 18h.01M16 18h.01M10 21h.01M14 21h.01',
  storm: 'M7 14h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7a3.5 3.5 0 0 0 1 7Zm6 0-2 4h3l-2 4',
  fog: 'M4 9h16M4 13h16M6 17h12',
  shield: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z',
  child: 'M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-5 3h10m-5 0v5m0 0-3 6m3-6 3 6',
  refresh: 'M20 11a8 8 0 0 0-14.8-3.5M4 4v4h4m-4 5a8 8 0 0 0 14.8 3.5M20 20v-4h-4',
  sparkle: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  readonly name: IconName;
  readonly size?: 'sm' | 'md' | 'lg';
  /** Accessible name; omit for decorative icons next to visible text. */
  readonly label?: string;
}

const SIZE_CLASS = { sm: 'ico ico-sm', md: 'ico', lg: 'ico ico-lg' } as const;

export function Icon({ name, size = 'md', label }: IconProps) {
  return (
    <svg
      className={SIZE_CLASS[size]}
      viewBox="0 0 24 24"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
