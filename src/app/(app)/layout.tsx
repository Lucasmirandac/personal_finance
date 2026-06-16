import { AppStoreProvider } from "@/lib/store";
import { FiltersProvider } from "@/lib/filtersContext";
import { AppShell } from "@/components/AppShell";
import { LaunchSplash } from "@/components/LaunchSplash";
import { CloudSyncProvider } from "@/components/CloudSyncProvider";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppStoreProvider>
      <CloudSyncProvider>
        <LaunchSplash />
        <FiltersProvider>
          <AppShell>{children}</AppShell>
        </FiltersProvider>
      </CloudSyncProvider>
    </AppStoreProvider>
  );
}
