import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COURSES } from "@/lib/courses";
import { FICHES } from "@/data/fiches";
import { FicheView } from "@/components/fiches/fiche-view";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = decodeURIComponent((await params).code);
  return { title: "Fiche · " + (COURSES[code]?.n ?? code) };
}

export default async function Page({ params }: Props) {
  const code = decodeURIComponent((await params).code);
  if (!COURSES[code] && !FICHES[code]) notFound();
  // Seule la fiche demandée est envoyée au navigateur
  return <FicheView code={code} html={FICHES[code] ?? null} />;
}
