import type { Metadata } from "next";
import { FICHES } from "@/data/fiches";
import { FichesIndex } from "@/components/fiches/fiche-view";

export const metadata: Metadata = { title: "Fiches" };

export default function Page() {
  return <FichesIndex available={Object.keys(FICHES)} />;
}
