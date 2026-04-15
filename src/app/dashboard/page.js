'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatsCard from '@/components/StatsCard';
import { formatCurrency } from '@/lib/csv-parser';

export default function DashboardPage() {
  const { supabase, user } = useAuth();
  const [stats, setStats] = useState({ conversions: 0, totalCommission: 0, paidCommission: 0, pendingCommission: 0 });
  const [recentConversions, setRecentConversions] = useState([]);
  const [recentCommissions, setRecentCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboard = async () => {
    try {
      // Count conversions
      const { count: convCount } = await supabase
        .from('conversions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get commission stats
      const { data: commissions } = await supabase
        .from('commissions')
        .select('user_share, payment_status')
        .eq('user_id', user.id);

      let total = 0, paid = 0, pending = 0;
      (commissions || []).forEach(c => {
        const share = parseFloat(c.user_share) || 0;
        total += share;
        if (c.payment_status === 'paid') paid += share;
        else pending += share;
      });

      setStats({
        conversions: convCount || 0,
        totalCommission: total,
        paidCommission: paid,
        pendingCommission: pending,
      });

      // Recent conversions
      const { data: convs } = await supabase
        .from('conversions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentConversions(convs || []);

      // Recent commissions
      const { data: comms } = await supabase
        .from('commissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentCommissions(comms || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Tổng quan</h1>
        <div className="stats-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="stats-card bg-gray-50 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Tổng quan</h1>

      {/* Stats */}
      <div className="stats-grid">
        <StatsCard icon="🔗" label="Link đã chuyển đổi" value={stats.conversions} color="primary" />
        <StatsCard icon="💰" label="Tổng hoa hồng" value={formatCurrency(stats.totalCommission)} color="info" />
        <StatsCard icon="✅" label="Đã nhận" value={formatCurrency(stats.paidCommission)} color="success" />
        <StatsCard icon="⏳" label="Chờ thanh toán" value={formatCurrency(stats.pendingCommission)} color="warning" />
      </div>

      {/* Recent conversions */}
      <div className="card">
        <h2 className="card-title">Chuyển đổi gần đây</h2>
        {recentConversions.length === 0 ? (
          <p className="text-muted text-sm py-4 text-center">Chưa có chuyển đổi nào</p>
        ) : (
          <div className="space-y-3">
            {recentConversions.map(conv => (
              <div key={conv.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {conv.product_image ? (
                  <img src={conv.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">📦</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{conv.product_name || 'Sản phẩm Shopee'}</p>
                  <p className="text-xs text-muted">ID: {conv.short_id} • {new Date(conv.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent commissions */}
      <div className="card">
        <h2 className="card-title">Hoa hồng gần đây</h2>
        {recentCommissions.length === 0 ? (
          <p className="text-muted text-sm py-4 text-center">Chưa có hoa hồng nào</p>
        ) : (
          <div className="space-y-3">
            {recentCommissions.map(comm => (
              <div key={comm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{comm.item_name || comm.order_id}</p>
                  <p className="text-xs text-muted">{comm.order_date ? new Date(comm.order_date).toLocaleDateString('vi-VN') : ''}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-primary">{formatCurrency(comm.user_share)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    comm.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    comm.payment_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {comm.payment_status === 'paid' ? 'Đã nhận' : comm.payment_status === 'cancelled' ? 'Hủy' : 'Chờ TT'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
