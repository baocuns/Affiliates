'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, profile, supabase, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankNote, setBankNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [message, setMessage] = useState('');
  const [bankMessage, setBankMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
    }
    loadPaymentInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadPaymentInfo = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('payment_info')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setBankName(data.bank_name || '');
      setAccountNumber(data.account_number || '');
      setAccountHolder(data.account_holder || '');
      setBankNote(data.note || '');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, phone, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setMessage('Đã cập nhật thông tin!');
    } catch (err) {
      setMessage('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    setSavingBank(true);
    setBankMessage('');
    try {
      const { error } = await supabase
        .from('payment_info')
        .upsert({
          user_id: user.id,
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder,
          note: bankNote,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) throw error;
      setBankMessage('Đã lưu thông tin chuyển khoản!');
    } catch (err) {
      setBankMessage('Lỗi: ' + err.message);
    } finally {
      setSavingBank(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      <h1 className="page-title">Cài đặt</h1>

      {/* Profile section */}
      <div className="card">
        <h2 className="card-title">Thông tin cá nhân</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled className="form-input disabled" />
          </div>
          <div className="form-field">
            <label>Tên hiển thị</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="form-input" />
          </div>
          <div className="form-field">
            <label>Số điện thoại</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="form-input" placeholder="0912 345 678" />
          </div>
          {message && <p className={`text-sm ${message.startsWith('Lỗi') ? 'text-red-500' : 'text-emerald-600'}`}>{message}</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Đang lưu...' : 'Cập nhật'}
          </button>
        </form>
      </div>

      {/* Bank info section */}
      <div className="card">
        <h2 className="card-title">Thông tin chuyển khoản</h2>
        <p className="text-sm text-muted mb-4">Thông tin này dùng để admin chuyển tiền hoa hồng cho bạn.</p>
        <form onSubmit={handleSaveBank} className="space-y-4">
          <div className="form-field">
            <label>Tên ngân hàng</label>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="form-input" placeholder="Vietcombank" />
          </div>
          <div className="form-field">
            <label>Số tài khoản</label>
            <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="form-input" placeholder="1234567890" />
          </div>
          <div className="form-field">
            <label>Tên chủ tài khoản</label>
            <input type="text" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="form-input" placeholder="NGUYEN VAN A" />
          </div>
          <div className="form-field">
            <label>Ghi chú</label>
            <input type="text" value={bankNote} onChange={e => setBankNote(e.target.value)} className="form-input" placeholder="Chi nhánh, thông tin thêm..." />
          </div>
          {bankMessage && <p className={`text-sm ${bankMessage.startsWith('Lỗi') ? 'text-red-500' : 'text-emerald-600'}`}>{bankMessage}</p>}
          <button type="submit" disabled={savingBank} className="btn-primary">
            {savingBank ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </form>
      </div>
    </div>
  );
}
