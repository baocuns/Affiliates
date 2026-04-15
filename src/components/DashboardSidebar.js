'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📊', label: 'Tổng quan', exact: true },
  { href: '/dashboard/conversions', icon: '🔗', label: 'Lịch sử chuyển đổi' },
  { href: '/dashboard/commissions', icon: '💰', label: 'Hoa hồng' },
  { href: '/dashboard/payments', icon: '💳', label: 'Lịch sử nhận tiền' },
  { href: '/dashboard/settings', icon: '⚙️', label: 'Cài đặt' },
];

export default function DashboardSidebar({ onClose }) {
  const pathname = usePathname();

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <nav className="sidebar-nav">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-brand">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <span className="font-bold text-foreground text-sm">Quản lý</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="sidebar-close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <ul className="sidebar-links">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onClose}
              className={`sidebar-link ${isActive(item) ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <Link href="/" className="sidebar-link" onClick={onClose}>
          <span className="sidebar-icon">←</span>
          <span>Về trang chủ</span>
        </Link>
      </div>
    </nav>
  );
}
