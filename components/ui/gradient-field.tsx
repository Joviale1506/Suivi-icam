// Composant sans état ni dépendance client : utilisable côté serveur comme côté client.

/**
 * Taches de couleur floues sur fond rose pâle (inspiré de la moitié gauche du modèle « CV créatif »).
 * Décor uniquement : placé en `absolute inset-0` dans un parent `relative`.
 */
export function GradientField({ className, variant = "panel" }: { className?: string; variant?: "panel" | "band" }) {
  return (
    <div aria-hidden className={className ? `blob-field ${className}` : "blob-field"}>
      {variant === "panel" ? (
        <>
          <span className="blob blob-a" style={{ width: "70%", height: "34%", top: "-8%", left: "30%" }} />
          <span className="blob blob-b" style={{ width: "60%", height: "30%", top: "26%", left: "-25%" }} />
          <span className="blob blob-c" style={{ width: "75%", height: "34%", top: "56%", left: "35%" }} />
          <span className="blob blob-d" style={{ width: "55%", height: "26%", bottom: "-10%", left: "-10%" }} />
        </>
      ) : (
        <>
          <span className="blob blob-a" style={{ width: "40%", height: "180%", top: "-60%", left: "-5%" }} />
          <span className="blob blob-b" style={{ width: "35%", height: "160%", top: "-40%", left: "30%" }} />
          <span className="blob blob-c" style={{ width: "40%", height: "180%", top: "-50%", right: "-8%" }} />
        </>
      )}
    </div>
  );
}
