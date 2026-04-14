'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import LinkConverter from '@/components/LinkConverter';
import ProductCard from '@/components/ProductCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Home() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <Header />

      <main className="flex-1 flex flex-col">
        {/* Hero section with dot pattern */}
        <section className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 dot-pattern opacity-40" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary/5 via-accent/3 to-transparent rounded-full blur-3xl" />

          <div className="relative max-w-xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8">
            {/* Hero text */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-full mb-4">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Nhanh chóng & Miễn phí
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Chuyển đổi link{' '}
                <span className="text-gradient">Shopee</span>
                <br/>
                thành link{' '}
                <span className="text-gradient">Affiliate</span>
              </h2>

              <p className="text-muted text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Dán link sản phẩm từ Shopee, nhận link affiliate ngay lập tức. 
                Hỗ trợ cả link rút gọn từ app.
              </p>
            </div>

            {/* Link Converter Form */}
            <LinkConverter 
              onResult={setResult} 
              onLoading={setIsLoading} 
            />
          </div>
        </section>

        {/* Result section */}
        <section className="max-w-xl mx-auto px-4 sm:px-6 pb-10 w-full">
          {isLoading && <LoadingSkeleton />}
          {!isLoading && result && <ProductCard data={result} />}
        </section>

        {/* How it works */}
        {!result && !isLoading && (
          <section className="max-w-xl mx-auto px-4 sm:px-6 pb-16 w-full animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-foreground">Cách sử dụng</h3>
            </div>

            <div className="grid gap-4">
              {[
                {
                  step: '1',
                  title: 'Copy link sản phẩm',
                  desc: 'Mở app Shopee, vào sản phẩm muốn mua, bấm Chia sẻ → Copy link',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  step: '2',
                  title: 'Dán vào ô trên',
                  desc: 'Paste link vào ô phía trên rồi bấm "Chuyển đổi link"',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  ),
                },
                {
                  step: '3',
                  title: 'Mua hàng',
                  desc: 'Bấm "Mua ngay" để mở trang Shopee với link affiliate và mua hàng',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5.4 5M7 13l-1.4 7h12.8M7 13h10m-9 7a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                  ),
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className="flex items-start gap-4 bg-white rounded-xl p-4 border border-border-light hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300"
                >
                  {/* Step number */}
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary">
                    {item.icon}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                        Bước {item.step}
                      </span>
                      <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                    </div>
                    <p className="text-muted text-xs mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-light py-4 text-center">
        <p className="text-xs text-muted">
          Shopee Affiliate Link Converter • Mua hàng giá tốt, nhận hoàn tiền
        </p>
      </footer>
    </>
  );
}
