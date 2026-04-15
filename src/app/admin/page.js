'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatsCard from '@/components/StatsCard';
import { formatCurrency } from '@/lib/csv-parser';

export default function AdminPage() {
  const { supabase } = useAuth();
  const [stats, setStats] = useState({ users: 0, conversions: 0, monthlyCommission: 0, unpaid: 0 });
  const [topUsers, setTopUsers] = useState([]);
  const [recentBatches, setRecentBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAdminDashboard = async () => {
    try {
      // Count users
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

      // Count conversions
      const { count: convCount } = await supabase.from('conversions').select('*', { count: 'exact', head: true });

      // Monthly commission (current month)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: monthComms } = await supabase
        .from('commissions')
        .select('total_commission')
        .gte('created_at', monthStart);
      const monthlyTotal = (monthComms || []).reduce((sum, c) => sum + (parseFloat(c.total_commission) || 0), 0);

      // Unpaid commissions
      const { data: unpaidComms } = await supabase
        .from('commissions')
        .select('user_share')
        .eq('payment_status', 'pending');
      const unpaidTotal = (unpaidComms || []).reduce((sum, c) => sum + (parseFloat(c.user_share) || 0), 0);

      setStats({
        users: userCount || 0,
        conversions: convCount || 0,
        monthlyCommission: monthlyTotal,
        unpaid: unpaidTotal,
      });

      // Top users by commission
      const { data: allComms } = await supabase
        .from('commissions')
        .select('user_id, user_share');

      const userMap = {};
      (allComms || []).forEach(c => {
        if (!c.user_id) return;
        if (!userMap[c.user_id]) userMap[c.user_id] = 0;
        userMap[c.user_id] += parseFloat(c.user_share) || 0;
      });

      const topUserIds = Object.entries(userMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (topUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', topUserIds.map(u => u[0]));

        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });

        setTopUsers(topUserIds.map(([id, total]) => ({
          ...profileMap[id],
          totalCommission: total,
        })));
      }

      // Recent import batches
      const { data: batches } = await supabase
        .from('import_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      setRecentBatches(batches || []);
    } catch (err) {
      console.error('Admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Admin — Tổng quan</h1>
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
      <h1 className="page-title">Admin — Tổng quan</h1>

      <div className="stats-grid">
        <StatsCard icon="👥" label="Người dùng" value={stats.users} color="info" />
        <StatsCard icon="🔗" label="Tổng conversions" value={stats.conversions} color="primary" />
        <StatsCard icon="💰" label="Hoa hồng tháng này" value={formatCurrency(stats.monthlyCommission)} color="success" />
        <StatsCard icon="⚠️" label="Chưa thanh toán" value={formatCurrency(stats.unpaid)} color="warning" />
      </div>

      {/* Top users */}
      <div className="card">
        <h2 className="card-title">Top người dùng</h2>
        {topUsers.length === 0 ? (
          <p className="text-muted text-sm py-4 text-center">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-2">
            {topUsers.map((u, i) => (
              <div key={u.id || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{u.display_name || u.email}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-primary">{formatCurrency(u.totalCommission)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent imports */}
      <div className="card">
        <h2 className="card-title">Import gần đây</h2>
        {recentBatches.length === 0 ? (
          <p className="text-muted text-sm py-4 text-center">Chưa có import nào</p>
        ) : (
          <div className="space-y-2">
            {recentBatches.map(batch => (
              <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium">{batch.filename}</p>
                  <p className="text-xs text-muted">
                    {new Date(batch.created_at).toLocaleDateString('vi-VN')} • {batch.matched_rows}/{batch.total_rows} matched
                  </p>
                </div>
                <span className={`status-badge ${batch.status === 'completed' ? 'status-paid' : 'status-pending'}`}>
                  {batch.status === 'completed' ? '✅' : '⏳'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
