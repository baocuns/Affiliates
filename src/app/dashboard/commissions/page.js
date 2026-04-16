'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DataTable from '@/components/DataTable';
import { formatCurrency } from '@/lib/csv-parser';

export default function CommissionsPage() {
  const { supabase, user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState({ total: 0, pending: 0, paid: 0 });

  useEffect(() => {
    if (!user) return;
    loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const loadCommissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('commissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('payment_status', filter);
      }

      const { data } = await query;
      setCommissions(data || []);

      // Calculate summary from all commissions (not filtered)
      const { data: allComms } = await supabase
        .from('commissions')
        .select('user_share, payment_status')
        .eq('user_id', user.id);

      let total = 0, pending = 0, paid = 0;
      (allComms || []).forEach(c => {
        const s = parseFloat(c.user_share) || 0;
        total += s;
        if (c.payment_status === 'paid') paid += s;
        else pending += s;
      });
      setSummary({ total, pending, paid });
    } catch (err) {
      console.error('Load commissions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Đơn hàng',
      key: 'order_id',
      width: '130px',
      render: (row) => (
        <div>
          <code className="text-xs font-mono">{row.order_id}</code>
          <p className="text-xs text-muted mt-0.5">{row.order_date ? new Date(row.order_date).toLocaleDateString('vi-VN') : ''}</p>
        </div>
      ),
    },
    {
      header: 'Sản phẩm',
      key: 'item_name',
      render: (row) => (
        <span className="text-sm truncate block max-w-[200px]">{row.item_name || '—'}</span>
      ),
    },
    {
      header: 'Giá trị',
      key: 'order_value',
      width: '100px',
      render: (row) => <span className="text-sm">{formatCurrency(row.order_value)}</span>,
    },
    {
      header: 'Hoa hồng',
      key: 'user_share',
      width: '140px',
      render: (row) => (
        <div>
          <span className="text-sm font-bold text-primary">{formatCurrency(row.user_share)}</span>
          {row.tax_amount > 0 && (
            <div className="text-[10px] text-muted mt-0.5 leading-tight">
              <p>Gốc: {formatCurrency(row.total_commission)}</p>
              <p>Thuế: {formatCurrency(row.tax_amount)}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Trạng thái',
      key: 'payment_status',
      width: '100px',
      render: (row) => (
        <span className={`status-badge ${row.payment_status === 'paid' ? 'status-paid' :
            row.payment_status === 'cancelled' ? 'status-cancelled' :
              'status-pending'
          }`}>
          {row.payment_status === 'paid' ? '✅ Đã nhận' : row.payment_status === 'cancelled' ? '❌ Hủy' : '⏳ Chờ TT'}
        </span>
      ),
    },
  ];

  const filters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ thanh toán' },
    { key: 'paid', label: 'Đã nhận' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Hoa hồng</h1>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex-1 min-w-[120px]">
          <p className="text-xs text-muted">Tổng hoa hồng</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(summary.total)}</p>
        </div>
        <div className="flex-1 min-w-[120px]">
          <p className="text-xs text-muted">Chờ thanh toán</p>
          <p className="text-lg font-bold text-amber-600">{formatCurrency(summary.pending)}</p>
        </div>
        <div className="flex-1 min-w-[120px]">
          <p className="text-xs text-muted">Đã nhận</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(summary.paid)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`filter-tab ${filter === f.key ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={commissions} loading={loading} emptyMessage="Chưa có hoa hồng nào" />
    </div>
  );
}
