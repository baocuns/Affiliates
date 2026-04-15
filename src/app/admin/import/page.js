'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/csv-parser';
import Papa from 'papaparse';

export default function ImportPage() {
  const { supabase } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setHistory(data || []);
  };

  const handleFile = (f) => {
    if (!f || !f.name.endsWith('.csv')) {
      setError('Vui lòng chọn file CSV');
      return;
    }
    setFile(f);
    setError('');
    setResult(null);

    // Preview first 10 rows
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = Papa.parse(text, { header: true, preview: 10, skipEmptyLines: true });
      setPreview({
        headers: parsed.meta.fields || [],
        rows: parsed.data,
        totalLines: text.split('\n').length - 1,
      });
    };
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shareRate', process.env.NEXT_PUBLIC_COMMISSION_USER_SHARE_RATE || '0.8');

      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Import thất bại');
      } else {
        setResult(data);
        loadHistory();
      }
    } catch (err) {
      setError('Lỗi: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Import CSV Hoa hồng</h1>

      {/* Upload area */}
      {!result && (
        <div
          className={`import-dropzone ${dragOver ? 'dragover' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => handleFile(e.target.files[0])}
            className="hidden"
          />

          {file ? (
            <div className="text-center">
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted mt-1">{(file.size / 1024).toFixed(1)} KB • {preview?.totalLines || 0} dòng</p>
              <button onClick={(e) => { e.stopPropagation(); resetForm(); }} className="text-xs text-red-500 hover:text-red-700 mt-2 cursor-pointer">
                ✕ Chọn file khác
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-50">📥</div>
              <p className="text-sm font-medium text-foreground">Kéo thả file CSV vào đây</p>
              <p className="text-xs text-muted mt-1">hoặc click để chọn file</p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && !result && (
        <div className="card">
          <h2 className="card-title">Xem trước ({preview.rows.length} dòng đầu / {preview.totalLines} tổng)</h2>
          <div className="data-table-wrapper" style={{ maxHeight: '300px' }}>
            <table className="data-table text-xs">
              <thead>
                <tr>
                  {['ID đơn hàng', 'Trạng thái đặt hàng', 'Tên Item', 'Giá(₫)', 'Hoa hồng ròng tiếp thị liên kết(₫)', 'Sub_id1', 'Sub_id2', 'Kênh'].map(h => (
                    <th key={h} className="whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className={row['Sub_id2'] ? 'bg-emerald-50/50' : ''}>
                    <td className="font-mono">{row['ID đơn hàng']}</td>
                    <td>{row['Trạng thái đặt hàng']}</td>
                    <td className="max-w-[200px] truncate">{row['Tên Item']}</td>
                    <td>{row['Giá(₫)']}</td>
                    <td className="font-semibold">{row['Hoa hồng ròng tiếp thị liên kết(₫)']}</td>
                    <td>{row['Sub_id1'] || '—'}</td>
                    <td className={row['Sub_id2'] ? 'font-bold text-emerald-700' : 'text-muted'}>{row['Sub_id2'] || '—'}</td>
                    <td>{row['Kênh']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-muted">
              💡 Dòng có <span className="text-emerald-700 font-bold">Sub_id2</span> sẽ được match với người dùng
            </p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-primary"
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang import...
                </span>
              ) : '📥 Xác nhận Import'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card">
          <h2 className="card-title">✅ Import hoàn tất</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-2xl font-bold">{result.results.total}</p>
              <p className="text-xs text-muted">Tổng dòng</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-emerald-600">{result.results.matched}</p>
              <p className="text-xs text-muted">Matched</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-amber-600">{result.results.unmatched}</p>
              <p className="text-xs text-muted">Unmatched</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-blue-600">{result.results.duplicated}</p>
              <p className="text-xs text-muted">Trùng lặp</p>
            </div>
          </div>

          {result.matchedDetails?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">Chi tiết matched:</h3>
              <div className="space-y-2">
                {result.matchedDetails.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg text-sm">
                    <span className="truncate flex-1">{m.item_name}</span>
                    <span className="font-bold text-primary ml-3">{formatCurrency(m.user_share)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={resetForm} className="btn-secondary mt-4">
            📥 Import file khác
          </button>
        </div>
      )}

      {/* History */}
      <div className="card">
        <h2 className="card-title">Lịch sử import</h2>
        {history.length === 0 ? (
          <p className="text-muted text-sm py-4 text-center">Chưa có import nào</p>
        ) : (
          <div className="space-y-2">
            {history.map(batch => (
              <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium">{batch.filename}</p>
                  <p className="text-xs text-muted">
                    {new Date(batch.created_at).toLocaleString('vi-VN')} • 
                    ✅ {batch.matched_rows} matched / {batch.total_rows} tổng •
                    ⚠️ {batch.unmatched_rows} unmatched •
                    🔄 {batch.duplicated_rows} trùng
                  </p>
                </div>
                <span className={`status-badge ${batch.status === 'completed' ? 'status-paid' : 'status-pending'}`}>
                  {batch.status === 'completed' ? '✅ Xong' : '⏳'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
