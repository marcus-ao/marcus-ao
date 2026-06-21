"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { englishLabel: 'Home', chineseLabel: '首页', href: '/' },
  { englishLabel: 'Blog', chineseLabel: '博客', href: '/blog' },
  { englishLabel: 'Share', chineseLabel: '分享', href: '/share' },
];

type NavLinksProps = {
  isChineseLocale?: boolean;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavLinks({ isChineseLocale = false }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <>
      {navItems.map(item => {
        const isActive = isActivePath(pathname, item.href);
        const label = isChineseLocale ? item.chineseLabel : item.englishLabel;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`mr-5 whitespace-nowrap no-underline transition-colors duration-200 ease-[var(--ease-standard)] hover:text-primary focus-visible:text-primary max-[480px]:mr-[15px] max-[480px]:text-[0.9rem] ${isActive ? 'text-primary' : 'text-foreground'}`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
