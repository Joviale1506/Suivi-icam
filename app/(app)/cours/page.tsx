import type { Metadata } from "next";
import { CoursesIndex } from "@/components/courses/courses-view";

export const metadata: Metadata = { title: "Cours" };

export default function Page() {
  return <CoursesIndex />;
}
