'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/csv-parser';

export default function AdminPaymentsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingUser, setPayingUser] = useState(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [payNote, setPayNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState('pending');
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/payments');
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (err) {
      console.error('Load payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!payingUser) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: payingUser.userId,
          commissionIds: payingUser.commissionIds,
          amount: payingUser.unpaidTotal,
          transactionRef,
          paymentMethod: 'bank_transfer',
          note: payNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPayingUser(null);
        setTransactionRef('');
        setPayNote('');
        loadData();
      }
    } catch (err) {
      console.error('Pay error:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Chi trả hoa hồng</h1>
        <div className="card animate-pulse">
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Chi trả hoa hồng</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('pending')} className={`filter-tab ${tab === 'pending' ? 'active' : ''}`}>
          Chưa thanh toán ({users.length})
        </button>
        <button onClick={() => setTab('history')} className={`filter-tab ${tab === 'history' ? 'active' : ''}`}>
          Lịch sử
        </button>
      </div>

      {tab === 'pending' && (
        <>
          {users.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-muted">Không có khoản nào cần thanh toán!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.userId} className="card">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{u.profile.display_name || u.profile.email}</p>
                      <p className="text-xs text-muted">{u.profile.email} • {u.profile.phone || 'Chưa có SĐT'}</p>
                      {u.paymentInfo ? (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs">
                          <p>🏦 {u.paymentInfo.bank_name} — {u.paymentInfo.account_number}</p>
                          <p className="font-medium">{u.paymentInfo.account_holder}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 mt-1">⚠️ Chưa có thông tin chuyển khoản</p>
                      )}
                    </div>

                    {/* Amount & action */}
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-primary">{formatCurrency(u.unpaidTotal)}</p>
                      <p className="text-xs text-muted mb-2">{u.commissionCount} đơn hàng</p>
                      <button
                        onClick={() => setPayingUser(u)}
                        className="btn-primary text-sm"
                      >
                        💳 Đánh dấu đã trả
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="card">
          <p className="text-muted text-sm text-center py-8">
            Xem lịch sử chi trả trong trang Hoa hồng &gt; filter &quot;Đã trả&quot;
          </p>
        </div>
      )}

      {/* Payment modal */}
      {payingUser && (
        <div className="auth-overlay" onClick={() => setPayingUser(null)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <button className="auth-close" onClick={() => setPayingUser(null)}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="auth-header">
              <h2 className="auth-title">Xác nhận thanh toán</h2>
              <p className="auth-subtitle">
                Trả <strong className="text-primary">{formatCurrency(payingUser.unpaidTotal)}</strong> cho <strong>{payingUser.profile.display_name}</strong>
              </p>
            </div>

            {payingUser.paymentInfo && (
              <div className="p-3 bg-blue-50 rounded-xl text-sm mb-4">
                <p>🏦 {payingUser.paymentInfo.bank_name}</p>
                <p className="font-mono font-bold">{payingUser.paymentInfo.account_number}</p>
                <p>{payingUser.paymentInfo.account_holder}</p>
              </div>
            )}

            <div className="auth-form">
              <div className="auth-field">
                <label>Mã giao dịch</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  placeholder="VCB123456..."
                />
              </div>
              <div className="auth-field">
                <label>Ghi chú</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="Hoa hồng tháng 4..."
                />
              </div>
              <button
                onClick={handlePay}
                disabled={processing}
                className="auth-submit"
              >
                {processing ? 'Đang xử lý...' : '✅ Xác nhận đã trả'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
