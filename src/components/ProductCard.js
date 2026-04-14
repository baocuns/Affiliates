'use client';

import { useState } from 'react';

export default function ProductCard({ data }) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!data) return null;

  const { product, affiliateLink } = data;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select text
      const textArea = document.createElement('textarea');
      textArea.value = affiliateLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleBuyNow = () => {
    window.open(affiliateLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full animate-fade-in-up">
      {/* Success badge */}
      <div className="flex items-center gap-2 text-success text-sm font-medium mb-3 px-1">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Chuyển đổi thành công!
      </div>

      {/* Product card */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-lg shadow-black/5 hover:shadow-xl transition-shadow duration-300">
        {/* Product info section */}
        <div className="flex gap-4 p-4">
          {/* Product image */}
          <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 border border-border-light">
            {product.image && !imgError ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                <svg className="w-10 h-10 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base leading-snug line-clamp-2">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-muted text-xs sm:text-sm mt-1.5 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
            {/* Shopee badge */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                Shopee
              </span>
            </div>
          </div>
        </div>

        {/* Affiliate link display */}
        <div className="mx-4 mb-3 hidden">
          <div className="bg-gray-50 rounded-xl p-3 border border-border-light">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted">Link Affiliate</span>
            </div>
            <p className="text-xs font-mono text-foreground/70 break-all leading-relaxed line-clamp-2">
              {affiliateLink}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 px-4 pb-4">
          {/* Copy button */}
          <button
            id="copy-link-button"
            onClick={handleCopy}
            className={`
              flex-1 py-3 px-4 rounded-xl font-semibold text-sm
              transition-all duration-300 cursor-pointer
              flex items-center justify-center gap-2
              ${copied
                ? 'bg-success/10 text-success border-2 border-success/20'
                : 'bg-gray-100 text-foreground hover:bg-gray-200 border-2 border-transparent active:scale-[0.97]'
              }
            `}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Đã copy!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy link
              </>
            )}
          </button>

          {/* Buy now button */}
          <button
            id="buy-now-button"
            onClick={handleBuyNow}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white
                       bg-gradient-to-r from-primary to-accent
                       hover:from-primary-dark hover:to-primary
                       shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25
                       transition-all duration-300 active:scale-[0.97] cursor-pointer
                       flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5.4 5M7 13l-1.4 7h12.8M7 13h10m-9 7a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            Mua ngay
          </button>
        </div>
      </div>
    </div>
  );
}
