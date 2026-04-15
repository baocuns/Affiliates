'use client';

import { useState } from 'react';

export default function LinkConverter({ onResult, onLoading }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Vui lòng nhập link sản phẩm Shopee');
      return;
    }


    setError('');
    setIsLoading(true);
    onLoading?.(true);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Có lỗi xảy ra, vui lòng thử lại');
        onResult?.(null);
      } else {
        onResult?.(data);
      }
    } catch (err) {
      setError('Không thể kết nối đến server. Vui lòng thử lại.');
      onResult?.(null);
    } finally {
      setIsLoading(false);
      onLoading?.(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setError('');
      }
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input container */}
        <div className="relative group">
          <div className={`
            flex items-center gap-2 bg-white rounded-2xl border-2 px-4 py-3
            transition-all duration-300 shadow-sm
            ${error ? 'border-red-300 shadow-red-100' : 'border-border hover:border-primary/30 focus-within:border-primary focus-within:shadow-lg focus-within:shadow-primary/5'}
          `}>
            {/* Search icon */}
            <svg className="w-5 h-5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>

            <input
              id="shopee-url-input"
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              placeholder="Dán link Shopee vào đây..."
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-gray-400 text-sm sm:text-base"
              disabled={isLoading}
              autoComplete="off"
            />

            {/* Paste button */}
            {!url && (
              <button
                type="button"
                onClick={handlePaste}
                className="shrink-0 text-xs font-medium text-primary hover:text-primary-dark 
                           bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg 
                           transition-colors cursor-pointer"
              >
                📋 Dán
              </button>
            )}

            {/* Clear button */}
            {url && (
              <button
                type="button"
                onClick={() => { setUrl(''); setError(''); }}
                className="shrink-0 text-muted hover:text-foreground p-1 rounded-full 
                           hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm px-1 animate-slide-down">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          id="convert-button"
          type="submit"
          disabled={isLoading || !url.trim()}
          className={`
            w-full py-3.5 px-6 rounded-2xl font-semibold text-white text-sm sm:text-base
            transition-all duration-300 cursor-pointer
            ${isLoading || !url.trim()
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang chuyển đổi...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Chuyển đổi link
            </span>
          )}
        </button>
      </form>

      {/* Hint */}
      <p className="text-center text-xs text-muted mt-3 px-2">
        Hỗ trợ link rút gọn <span className="font-mono text-primary/70">s.shopee.vn</span> và link đầy đủ <span className="font-mono text-primary/70">shopee.vn</span>
      </p>


    </div>
  );
}
