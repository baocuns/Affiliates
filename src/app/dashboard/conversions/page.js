'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DataTable from '@/components/DataTable';

export default function ConversionsPage() {
  const { supabase, user } = useAuth();
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    if (!user) return;
    loadConversions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);

  const loadConversions = async () => {
    setLoading(true);
    try {
      const { count } = await supabase
        .from('conversions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotal(count || 0);

      const { data } = await supabase
        .from('conversions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      setConversions(data || []);
    } catch (err) {
      console.error('Load conversions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {}
  };

  const columns = [
    {
      header: 'Thời gian',
      key: 'created_at',
      width: '110px',
      render: (row) => (
        <span className="text-xs text-muted whitespace-nowrap">
          {new Date(row.created_at).toLocaleDateString('vi-VN')}<br/>
          {new Date(row.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      header: 'Sản phẩm',
      key: 'product_name',
      render: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          {row.product_image ? (
            <img src={row.product_image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs shrink-0">📦</div>
          )}
          <span className="text-sm text-foreground truncate">{row.product_name || 'Sản phẩm Shopee'}</span>
        </div>
      ),
    },
    {
      header: 'Short ID',
      key: 'short_id',
      width: '90px',
      render: (row) => (
        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{row.short_id}</code>
      ),
    },
    {
      header: '',
      key: 'action',
      width: '60px',
      render: (row) => (
        <button
          onClick={() => handleCopy(row.affiliate_url)}
          className="text-xs text-primary hover:text-primary-dark font-medium cursor-pointer"
        >
          📋 Copy
        </button>
      ),
    },
  ];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Lịch sử chuyển đổi</h1>
        <span className="text-sm text-muted">{total} link</span>
      </div>

      <DataTable columns={columns} data={conversions} loading={loading} emptyMessage="Chưa có link nào được chuyển đổi" />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="pagination-btn"
          >
            ←
          </button>
          <span className="text-sm text-muted">
            Trang {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="pagination-btn"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
