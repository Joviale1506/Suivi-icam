import type { Metadata } from "next";
import { Suspense } from "react";
import { GradientField } from "@/components/ui/gradient-field";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

/** Écran partagé : taches floues à gauche, formulaire sur aplat rose à droite */
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <GradientField />
      </div>
      <div className="relative grid place-items-center px-4 py-10">
        <div className="absolute inset-x-0 top-0 h-28 overflow-hidden lg:hidden">
          <GradientField variant="band" />
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
