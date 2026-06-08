import { AppStoreProvider } from "@/lib/store";
import { FiltersProvider } from "@/lib/filtersContext";
import { AppShell } from "@/components/AppShell";
import { LaunchSplash } from "@/components/LaunchSplash";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppStoreProvider>
      <LaunchSplash />
      <FiltersProvider>
        <AppShell>{children}</AppShell>
      </FiltersProvider>
    </AppStoreProvider>
  );
}
