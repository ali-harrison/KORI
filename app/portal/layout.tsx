export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0d0c]">
      {/* Simple portal header */}
      <header className="border-b border-[#1b201c] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[7px] bg-[#151a16] border border-[#232823] flex items-center justify-center">
              <span className="text-[10px] font-medium text-[var(--accent)]">PG</span>
            </div>
            <span className="text-sm font-medium text-[#e7eae8]">Southerly Strength</span>
          </div>
          <a
            href="/portal/account"
            className="text-xs text-[#8f978f] hover:text-[#e7eae8] transition-colors duration-150"
          >
            My account
          </a>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
