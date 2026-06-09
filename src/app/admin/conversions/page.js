'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DataTable from '@/components/DataTable';
import { formatCurrency } from '@/lib/csv-parser';

export default function AdminConversionsPage() {
  const { supabase } = useAuth();
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [expandedConversions, setExpandedConversions] = useState(new Set());
  const [stats, setStats] = useState({ totalLinks: 0, totalCommission: 0, totalOrders: 0 });
  const pageSize = 15;

  useEffect(() => {
    loadAllConversions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllConversions = async () => {
    setLoading(true);
    try {
      // Fetch profiles first to map names/emails in memory, bypassing schema join limitations
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email');

      if (profilesError) throw profilesError;

      const profileMap = {};
      (profilesData || []).forEach(p => {
        profileMap[p.id] = p;
      });

      // Fetch conversions with commissions
      const { data, error } = await supabase
        .from('conversions')
        .select(`
          *,
          commissions(
            id,
            order_id,
            item_name,
            total_commission,
            user_share,
            payment_status,
            order_status,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = (data || []).map(c => ({
        ...c,
        profiles: profileMap[c.user_id] || null
      }));
      setConversions(items);

      // Compute statistics
      let commissionSum = 0;
      let orderCount = 0;
      items.forEach(c => {
        const comms = c.commissions || [];
        orderCount += comms.length;
        comms.forEach(comm => {
          if (comm.order_status !== 'Đã hủy') {
            commissionSum += parseFloat(comm.user_share) || 0;
          }
        });
      });

      setStats({
        totalLinks: items.length,
        totalCommission: commissionSum,
        totalOrders: orderCount,
      });
    } catch (err) {
      console.error('Lỗi khi tải danh sách conversions admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (conversionId) => {
    setExpandedConversions(prev => {
      const next = new Set(prev);
      if (next.has(conversionId)) {
        next.delete(conversionId);
      } else {
        next.add(conversionId);
      }
      return next;
    });
  };

  const handleCopy = async (e, link) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(link);
      alert('Đã copy link chuyển đổi!');
    } catch {}
  };

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [search]);

  const filtered = search
    ? conversions.filter(c =>
        (c.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.short_id || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.original_url || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.profiles?.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.profiles?.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : conversions;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const columns = [
    {
      header: 'Thời gian / User',
      key: 'created_at',
      width: '180px',
      render: (row) => (
        <div>
          <p className="text-xs text-muted">
            {new Date(row.created_at).toLocaleDateString('vi-VN')} {new Date(row.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {row.profiles?.display_name || '—'}
          </p>
          <p className="text-xs text-muted truncate max-w-[170px]" title={row.profiles?.email}>
            {row.profiles?.email || '—'}
          </p>
        </div>
      ),
    },
    {
      header: 'Sản phẩm',
      key: 'product_name',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.product_image ? (
            <img src={row.product_image} alt="" className="w-9 h-9 rounded object-cover shrink-0 border border-gray-100" />
          ) : (
            <div className="w-9 h-9 rounded bg-gray-50 flex items-center justify-center text-xs shrink-0 border border-gray-100">📦</div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate max-w-[200px]" title={row.product_name}>
              {row.product_name || 'Sản phẩm Shopee'}
            </p>
            <a 
              href={row.original_url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs text-primary hover:underline truncate block max-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              Link gốc ↗
            </a>
          </div>
        </div>
      ),
    },
    {
      header: 'Short ID',
      key: 'short_id',
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{row.short_id}</code>
          <button 
            onClick={(e) => handleCopy(e, row.affiliate_url)}
            className="p-1 hover:bg-gray-200 rounded text-muted hover:text-foreground text-xs"
            title="Copy link"
          >
            📋
          </button>
        </div>
      ),
    },
    {
      header: 'Tổng HH nhận',
      key: 'user_share_total',
      width: '110px',
      render: (row) => {
        const comms = row.commissions || [];
        const userCommissionTotal = comms.reduce((sum, comm) => {
          if (comm.order_status !== 'Đã hủy') {
            return sum + (parseFloat(comm.user_share) || 0);
          }
          return sum;
        }, 0);

        return (
          <span className="text-sm font-bold text-primary">
            {formatCurrency(userCommissionTotal)}
          </span>
        );
      },
    },
    {
      header: 'Đơn hàng',
      key: 'orders_count',
      width: '100px',
      render: (row) => {
        const comms = row.commissions || [];
        return (
          <button 
            onClick={() => toggleExpand(row.id)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              comms.length > 0 
                ? 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                : 'bg-gray-50 border-gray-100 text-muted'
            }`}
            disabled={comms.length === 0}
          >
            {comms.length} đơn {expandedConversions.has(row.id) ? '▲' : '▼'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Quản lý link chuyển đổi</h1>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted font-medium">Tổng số link chuyển đổi</p>
          <p className="text-2xl font-bold mt-2">{stats.totalLinks}</p>
        </div>
        <div className="card p-4 border border-emerald-100 bg-emerald-50/20 flex flex-col justify-between">
          <p className="text-xs text-emerald-700 font-medium">Tổng hoa hồng đã khớp</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(stats.totalCommission)}</p>
        </div>
        <div className="card p-4 border border-blue-100 bg-blue-50/20 flex flex-col justify-between">
          <p className="text-xs text-blue-700 font-medium">Tổng đơn hàng khớp</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{stats.totalOrders} đơn</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo sản phẩm, người dùng, short ID..."
          className="form-input flex-1"
        />
        <span className="text-sm text-muted whitespace-nowrap">{filtered.length} kết quả</span>
      </div>

      {/* Table & Expanded Accordions */}
      <div className="data-table-wrapper">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <svg className="animate-spin w-8 h-8 mx-auto text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-muted">Đang tải danh sách link...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-muted text-sm bg-white rounded-xl border border-gray-100">
            Không tìm thấy link chuyển đổi nào.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col, i) => (
                  <th key={i} style={col.width ? { width: col.width } : {}}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, i) => {
                const comms = row.commissions || [];
                return (
                  <React.Fragment key={row.id || i}>
                    <tr 
                      className={`hover:bg-gray-50/50 cursor-pointer ${
                        expandedConversions.has(row.id) ? 'bg-gray-50/30' : ''
                      }`}
                      onClick={() => comms.length > 0 && toggleExpand(row.id)}
                    >
                      {columns.map((col, j) => (
                        <td key={j}>
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>

                    {/* Expandable commissions list */}
                    {expandedConversions.has(row.id) && comms.length > 0 && (
                      <tr className="bg-gray-50/40">
                        <td colSpan="5" className="p-4 border-b border-gray-100">
                          <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Chi tiết các đơn hàng khớp link này ({comms.length}):</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {comms.map((comm) => (
                                <div key={comm.id} className="p-3 bg-white rounded-xl border border-gray-100 flex flex-col gap-1.5 shadow-sm">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-foreground">Mã đơn: <code className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{comm.order_id}</code></span>
                                    <span className="text-muted">{new Date(comm.created_at).toLocaleString('vi-VN')}</span>
                                  </div>
                                  <p className="text-sm text-foreground font-medium truncate">{comm.item_name || 'Tên sản phẩm đơn hàng'}</p>
                                  <div className="flex justify-between items-center text-xs mt-1 pt-1.5 border-t border-gray-50">
                                    <div>
                                      <p className="text-[10px] text-muted">Hoa hồng nhận</p>
                                      <p className="text-sm font-bold text-primary">{formatCurrency(comm.user_share)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-muted text-right">Trạng thái</p>
                                      <span className={`status-badge ${
                                        comm.order_status === 'Đã hủy'
                                          ? 'status-cancelled'
                                          : comm.payment_status === 'paid'
                                            ? 'status-paid'
                                            : 'status-pending'
                                      }`}>
                                        {comm.order_status === 'Đã hủy' ? '❌ Đã hủy' : comm.payment_status === 'paid' ? '✅ Đã trả' : '⏳ Chờ TT'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
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
