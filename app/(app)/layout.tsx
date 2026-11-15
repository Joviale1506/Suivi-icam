import { loadAppData } from "@/lib/server/data";
import { AppProvider } from "@/components/providers/app-provider";
import { Shell } from "@/components/shell/shell";

// Données par utilisateur, lues à chaque requête (le planning reste en cache 15 min via fetch)
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await loadAppData();
  return (
    <AppProvider data={data} serverNow={new Date().toISOString()}>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
