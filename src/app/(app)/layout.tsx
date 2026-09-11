import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { BottomNav } from "@/components/nav/bottom-nav";
import { PracticeSidebarProvider } from "@/components/practice/practice-sidebar-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <PracticeSidebarProvider>
      <div className="flex min-h-screen">
        <SidebarNav />
        <div className="flex-1 pb-16 md:pb-0">{children}</div>
        <BottomNav />
      </div>
    </PracticeSidebarProvider>
  );
}
