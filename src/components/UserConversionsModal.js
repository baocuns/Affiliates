'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/csv-parser';

export default function UserConversionsModal({ isOpen, onClose, user }) {
  const { supabase } = useAuth();
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedConversions, setExpandedConversions] = useState(new Set());
  const [stats, setStats] = useState({ totalLinks: 0, totalCommission: 0, totalOrders: 0 });

  useEffect(() => {
    if (isOpen && user?.id) {
      loadUserConversions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const loadUserConversions = async () => {
    setLoading(true);
    setExpandedConversions(new Set());
    try {
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = data || [];
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
      console.error('Lỗi khi tải danh sách conversion của user:', err);
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

  if (!isOpen || !user) return null;

  const filtered = search
    ? conversions.filter(c =>
        (c.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.short_id || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.original_url || '').toLowerCase().includes(search.toLowerCase())
      )
    : conversions;

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div 
        className="auth-modal max-w-4xl w-full p-6 bg-white rounded-2xl relative shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: '850px', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          className="auth-close hover:bg-gray-100 p-2 rounded-full absolute top-4 right-4 text-gray-500 transition-colors"
          onClick={onClose}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-4 pr-8">
          <h2 className="text-xl font-bold text-foreground mb-1">
            Chi tiết link chuyển đổi
          </h2>
          <p className="text-sm text-muted">
            Người dùng: <span className="font-semibold text-foreground">{user.display_name || '—'}</span> ({user.email})
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <p className="text-xs text-muted">Tổng link tạo</p>
            <p className="text-lg font-bold text-foreground">{stats.totalLinks}</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p className="text-xs text-emerald-700">Tổng hoa hồng nhận</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalCommission)}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-700">Đơn hàng đã khớp</p>
            <p className="text-lg font-bold text-blue-600">{stats.totalOrders} đơn</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm theo sản phẩm, short ID hoặc link..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input text-sm"
          />
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1 border border-gray-100 rounded-xl min-h-[300px]">
          {loading ? (
            <div className="p-10 text-center space-y-3">
              <svg className="animate-spin w-8 h-8 mx-auto text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-muted">Đang tải danh sách link...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted text-sm">
              Chưa có link chuyển đổi nào khớp với tìm kiếm.
            </div>
          ) : (
            <table className="data-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3 text-xs font-semibold text-muted uppercase">Thời gian</th>
                  <th className="p-3 text-xs font-semibold text-muted uppercase">Sản phẩm</th>
                  <th className="p-3 text-xs font-semibold text-muted uppercase">Short ID</th>
                  <th className="p-3 text-xs font-semibold text-muted uppercase text-right">Hoa hồng nhận</th>
                  <th className="p-3 text-xs font-semibold text-muted uppercase text-center">Đơn hàng</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const comms = c.commissions || [];
                  const userCommissionTotal = comms.reduce((sum, comm) => {
                    if (comm.order_status !== 'Đã hủy') {
                      return sum + (parseFloat(comm.user_share) || 0);
                    }
                    return sum;
                  }, 0);

                  return (
                    <React.Fragment key={c.id}>
                      <tr 
                        className={`hover:bg-gray-50/80 border-b border-gray-50 cursor-pointer ${
                          expandedConversions.has(c.id) ? 'bg-gray-50/40' : ''
                        }`}
                        onClick={() => toggleExpand(c.id)}
                      >
                        <td className="p-3 text-xs text-muted whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString('vi-VN')}<br/>
                          {new Date(c.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 max-w-[200px]">
                          <div className="flex items-center gap-2">
                            {c.product_image ? (
                              <img src={c.product_image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs shrink-0">📦</div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{c.product_name || 'Sản phẩm Shopee'}</p>
                              <a 
                                href={c.original_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-primary hover:underline truncate block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Link gốc ↗
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{c.short_id}</code>
                            <button 
                              onClick={(e) => handleCopy(e, c.affiliate_url)}
                              className="p-1 hover:bg-gray-200 rounded text-muted hover:text-foreground"
                              title="Copy link"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(userCommissionTotal)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                              comms.length > 0 
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                                : 'bg-gray-50 border-gray-100 text-muted'
                            }`}
                            disabled={comms.length === 0}
                          >
                            {comms.length} đơn {expandedConversions.has(c.id) ? '▲' : '▼'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Order list */}
                      {expandedConversions.has(c.id) && comms.length > 0 && (
                        <tr className="bg-gray-50/40">
                          <td colSpan="5" className="p-4 border-b border-gray-100">
                            <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Chi tiết đơn hàng khớp ({comms.length}):</p>
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
      </div>
    </div>
  );
}
