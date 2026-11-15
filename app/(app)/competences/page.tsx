import type { Metadata } from "next";
import { Suspense } from "react";
import { CompetencesView } from "@/components/competences/competences-view";

export const metadata: Metadata = { title: "Compétences" };

export default function Page() {
  return (
    <Suspense>
      <CompetencesView />
    </Suspense>
  );
}
