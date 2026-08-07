import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { LogOut } from "lucide-react";
import { NavLinks } from "./nav-links";
import { logout } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 border-r bg-muted/20 md:flex md:flex-col">
        <div className="px-4 py-5">
          <span className="text-lg font-semibold">Billing CRM</span>
        </div>
        <div className="flex-1 px-3">
          <NavLinks />
        </div>
        <div className="border-t p-3">
          <p className="truncate px-1 pb-2 text-xs text-muted-foreground">
            {user.email}
          </p>
          <form action={logout}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-lg font-semibold">Billing CRM</span>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
          <div className="overflow-x-auto px-3 pb-3">
            <NavLinks orientation="horizontal" />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
