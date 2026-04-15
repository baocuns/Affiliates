'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DataTable from '@/components/DataTable';
import { formatCurrency } from '@/lib/csv-parser';

export default function PaymentsPage() {
  const { supabase, user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPayments = async () => {
    try {
      const { data } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setPayments(data || []);
    } catch (err) {
      console.error('Load payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Ngày',
      key: 'created_at',
      width: '100px',
      render: (row) => <span className="text-sm">{new Date(row.created_at).toLocaleDateString('vi-VN')}</span>,
    },
    {
      header: 'Số tiền',
      key: 'amount',
      width: '120px',
      render: (row) => <span className="text-sm font-bold text-emerald-600">{formatCurrency(row.amount)}</span>,
    },
    {
      header: 'Phương thức',
      key: 'payment_method',
      width: '120px',
      render: (row) => <span className="text-sm">{row.payment_method === 'bank_transfer' ? '🏦 Chuyển khoản' : row.payment_method}</span>,
    },
    {
      header: 'Mã GD',
      key: 'transaction_ref',
      render: (row) => <code className="text-xs font-mono">{row.transaction_ref || '—'}</code>,
    },
    {
      header: 'Ghi chú',
      key: 'note',
      render: (row) => <span className="text-sm text-muted">{row.note || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Lịch sử nhận tiền</h1>
      <DataTable columns={columns} data={payments} loading={loading} emptyMessage="Chưa có lịch sử nhận tiền" />
    </div>
  );
}
