'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { USDA_ZONE } from '@/lib/domain/constants';
import { Icon } from '../ui/Icon';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/', label: 'Today' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/shopping', label: 'Shopping' },
  { href: '/settings', label: 'Settings' },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site">
      <div className="shell">
        <Link href="/" className="wordmark" aria-label="Greenkeeper home">
          <Icon name="leaf" />
          Greenkeeper <small>Zone {USDA_ZONE}</small>
        </Link>
        <nav className="main" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
