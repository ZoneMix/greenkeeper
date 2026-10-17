import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/layout.css';
import '@/styles/components.css';
import '@/styles/features.css';
import '@/styles/motion.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Icon } from '@/components/ui/Icon';
import { THEME_INIT_SCRIPT } from '@/components/layout/ThemeToggle';
import { ANNOUNCER_ID } from '@/lib/announce';
import { LOCATION_LABEL, USDA_ZONE } from '@/lib/domain/constants';
import { SEASON_RANGE_SHORT } from '@/lib/domain/season';

export const metadata: Metadata = {
  title: { default: 'Greenkeeper', template: '%s · Greenkeeper' },
  description: `Organic, kid- and pet-safe lawn care planner for ${LOCATION_LABEL} (USDA Zone ${USDA_ZONE}).`,
};

export const viewport: Viewport = {
  themeColor: [
    // Mirrors --bg in src/styles/tokens.css (day / night).
    { media: '(prefers-color-scheme: light)', color: '#f6f0e4' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1511' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          <div className="shell">{children}</div>
        </main>
        <div id={ANNOUNCER_ID} className="sr-only" role="status" aria-live="polite" />
        <footer className="site">
          <div className="shell">
            <div>
              <small>
                {LOCATION_LABEL} · USDA Zone {USDA_ZONE} · Growing season {SEASON_RANGE_SHORT}
              </small>
              <small>
                <Icon name="leaf" size="sm" />
                Only organic, kid- and pet-safe products
              </small>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
