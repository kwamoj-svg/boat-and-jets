"use client";

// Fallback for catastrophic errors that break even the root layout.
// Must not import Navbar/Footer — those might be the cause.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0a1628",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#c8a55a",
              marginBottom: 8,
            }}
          >
            Kritischer Fehler
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 300, margin: "0 0 16px" }}>
            VELIQA ist temporär nicht erreichbar
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
            Bitte versuche es in einem Moment erneut. Wir wurden automatisch benachrichtigt.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: 11, color: "#4b5563", marginBottom: 24 }}>
              Referenz: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              background: "#c8a55a",
              color: "#0a1628",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
