'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DataTable from '@/components/DataTable';
import { formatCurrency } from '@/lib/csv-parser';

export default function AdminUsersPage() {
  const { supabase } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Get conversion counts
      const { data: convCounts } = await supabase
        .from('conversions')
        .select('user_id');

      const convMap = {};
      (convCounts || []).forEach(c => {
        convMap[c.user_id] = (convMap[c.user_id] || 0) + 1;
      });

      // Get commission totals
      const { data: commissions } = await supabase
        .from('commissions')
        .select('user_id, user_share');

      const commMap = {};
      (commissions || []).forEach(c => {
        if (c.user_id) {
          commMap[c.user_id] = (commMap[c.user_id] || 0) + (parseFloat(c.user_share) || 0);
        }
      });

      const enriched = (profiles || []).map(p => ({
        ...p,
        conversionCount: convMap[p.id] || 0,
        totalCommission: commMap[p.id] || 0,
      }));

      setUsers(enriched);
    } catch (err) {
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? users.filter(u =>
        (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const columns = [
    {
      header: 'Tên',
      key: 'display_name',
      render: (row) => (
        <div>
          <p className="text-sm font-medium">{row.display_name || '—'}</p>
          <p className="text-xs text-muted">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'SĐT',
      key: 'phone',
      width: '110px',
      render: (row) => <span className="text-sm">{row.phone || '—'}</span>,
    },
    {
      header: 'Role',
      key: 'role',
      width: '80px',
      render: (row) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          row.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {row.role}
        </span>
      ),
    },
    {
      header: 'Links',
      key: 'conversionCount',
      width: '70px',
      render: (row) => <span className="text-sm text-center block">{row.conversionCount}</span>,
    },
    {
      header: 'Hoa hồng',
      key: 'totalCommission',
      width: '110px',
      render: (row) => <span className="text-sm font-semibold text-primary">{formatCurrency(row.totalCommission)}</span>,
    },
    {
      header: 'Ngày ĐK',
      key: 'created_at',
      width: '100px',
      render: (row) => <span className="text-xs text-muted">{new Date(row.created_at).toLocaleDateString('vi-VN')}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Quản lý người dùng</h1>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc email..."
          className="form-input flex-1"
        />
        <span className="text-sm text-muted whitespace-nowrap">{filtered.length} users</span>
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="Chưa có người dùng" />
    </div>
  );
}
