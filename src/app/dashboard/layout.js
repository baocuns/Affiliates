'use client';

import { useState } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <DashboardSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
        {/* Mobile header */}
        <div className="dashboard-mobile-header">
          <button onClick={() => setSidebarOpen(true)} className="sidebar-toggle">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-foreground">Quản lý</span>
          <div className="w-6" />
        </div>

        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
}
