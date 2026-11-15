import type { Metadata } from "next";
import { SyncView } from "@/components/sync/sync-view";

export const metadata: Metadata = { title: "Synchro" };

export default function Page() {
  return <SyncView />;
}
