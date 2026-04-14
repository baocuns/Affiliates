export default function Header() {
  return (
    <header className="w-full border-b border-border-light bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-gradient">Shopee</span>
              <span className="text-foreground"> Link</span>
            </h1>
            <p className="text-[10px] text-muted -mt-0.5 tracking-wide uppercase font-medium">Affiliate Converter</p>
          </div>
        </div>

        {/* Badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-success font-medium bg-success-bg px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          Hoạt động
        </div>
      </div>
    </header>
  );
}
