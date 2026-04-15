'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DataTable from '@/components/DataTable';
import { formatCurrency } from '@/lib/csv-parser';

export default function AdminCommissionsPage() {
  const { supabase } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState({ total: 0, userTotal: 0, ownerTotal: 0, unpaid: 0 });

  useEffect(() => {
    loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadCommissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('commissions')
        .select('*, profiles:user_id(display_name, email)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('payment_status', filter);
      }

      const { data } = await query;
      setCommissions(data || []);

      // Summary
      const { data: allComms } = await supabase.from('commissions').select('total_commission, user_share, owner_share, payment_status');
      let total = 0, userTotal = 0, ownerTotal = 0, unpaid = 0;
      (allComms || []).forEach(c => {
        total += parseFloat(c.total_commission) || 0;
        userTotal += parseFloat(c.user_share) || 0;
        ownerTotal += parseFloat(c.owner_share) || 0;
        if (c.payment_status === 'pending') unpaid += parseFloat(c.user_share) || 0;
      });
      setSummary({ total, userTotal, ownerTotal, unpaid });
    } catch (err) {
      console.error('Load commissions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Người dùng',
      key: 'user',
      width: '140px',
      render: (row) => (
        <div>
          <p className="text-sm font-medium truncate">{row.profiles?.display_name || '—'}</p>
          <p className="text-xs text-muted truncate">{row.profiles?.email || 'Unmatched'}</p>
        </div>
      ),
    },
    {
      header: 'Đơn hàng',
      key: 'order_id',
      width: '120px',
      render: (row) => <code className="text-xs font-mono">{row.order_id}</code>,
    },
    {
      header: 'Sản phẩm',
      key: 'item_name',
      render: (row) => <span className="text-sm truncate block max-w-[180px]">{row.item_name || '—'}</span>,
    },
    {
      header: 'Tổng HH',
      key: 'total_commission',
      width: '100px',
      render: (row) => <span className="text-sm">{formatCurrency(row.total_commission)}</span>,
    },
    {
      header: 'User nhận',
      key: 'user_share',
      width: '100px',
      render: (row) => <span className="text-sm font-bold text-primary">{formatCurrency(row.user_share)}</span>,
    },
    {
      header: 'TT',
      key: 'payment_status',
      width: '70px',
      render: (row) => (
        <span className={`status-badge ${row.payment_status === 'paid' ? 'status-paid' : 'status-pending'}`}>
          {row.payment_status === 'paid' ? '✅' : '⏳'}
        </span>
      ),
    },
  ];

  const filters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ TT' },
    { key: 'paid', label: 'Đã trả' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Hoa hồng — Tổng hợp</h1>

      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex-1 min-w-[100px]">
          <p className="text-xs text-muted">Tổng HH Shopee</p>
          <p className="text-lg font-bold">{formatCurrency(summary.total)}</p>
        </div>
        <div className="flex-1 min-w-[100px]">
          <p className="text-xs text-muted">Users nhận</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(summary.userTotal)}</p>
        </div>
        <div className="flex-1 min-w-[100px]">
          <p className="text-xs text-muted">Owner giữ</p>
          <p className="text-lg font-bold text-purple-600">{formatCurrency(summary.ownerTotal)}</p>
        </div>
        <div className="flex-1 min-w-[100px]">
          <p className="text-xs text-muted">Chưa trả</p>
          <p className="text-lg font-bold text-amber-600">{formatCurrency(summary.unpaid)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`filter-tab ${filter === f.key ? 'active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={commissions} loading={loading} emptyMessage="Chưa có hoa hồng" />
    </div>
  );
}
