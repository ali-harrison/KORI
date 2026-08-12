import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ThemeSettingsProvider } from "@/components/providers/ThemeSettingsProvider";

interface AppShellProps {
  gymName: string;
  memberCount: number;
  userEmail?: string;
  children: React.ReactNode;
}

// Persistent chrome across every /dashboard/* route — sidebar + topbar +
// scrollable content. Page-specific action buttons (Add member, Record
// payment, New plan) live in each page's own content, not here — the
// topbar has no actions slot in this design, only title + global search.
export function AppShell({ gymName, memberCount, userEmail, children }: AppShellProps) {
  return (
    <ThemeSettingsProvider>
      <div className="flex h-full bg-[#0b0d0c] text-[14px]">
        <Sidebar gymName={gymName} memberCount={memberCount} userEmail={userEmail} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar userEmail={userEmail} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1120px] mx-auto px-7 py-[26px] pb-12">{children}</div>
          </main>
        </div>
      </div>
    </ThemeSettingsProvider>
  );
}
