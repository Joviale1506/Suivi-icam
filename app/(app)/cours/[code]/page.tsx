import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COURSES } from "@/lib/courses";
import { CourseDetail } from "@/components/courses/courses-view";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = decodeURIComponent((await params).code);
  return { title: COURSES[code]?.n ?? "Cours" };
}

export default async function Page({ params }: Props) {
  const code = decodeURIComponent((await params).code);
  if (!COURSES[code]) notFound();
  return <CourseDetail code={code} />;
}
