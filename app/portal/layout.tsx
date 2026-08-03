export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      {/* Simple portal header */}
      <header className="border-b border-[rgba(255,255,255,0.06)] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[6px] bg-[#e8ff47] flex items-center justify-center">
              <span className="text-[10px] font-black text-[#0c0c0c] tracking-tight">KG</span>
            </div>
            <span className="text-sm font-semibold text-[#f5f5f5]">Southerly Strength</span>
          </div>
          <a
            href="/portal/account"
            className="text-xs text-[#888888] hover:text-[#f5f5f5] transition-colors duration-150"
          >
            My account
          </a>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
