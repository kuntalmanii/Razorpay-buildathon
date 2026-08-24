/**
 * RecoverIQ — Landing / placeholder page.
 *
 * Phase 0: Minimal stub confirming the frontend is running and can reach
 * the backend. The full dashboard will be built in a later phase.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        background: "#0a0a0f",
        color: "#f0f0f5",
        gap: "1.5rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, margin: 0 }}>
        RecoverIQ
      </h1>
      <p
        style={{
          fontSize: "1.125rem",
          color: "#8b8b9e",
          maxWidth: "480px",
          margin: 0,
        }}
      >
        AI Revenue Recovery Agent for Razorpay merchants.
      </p>

      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1.5rem",
          borderRadius: "8px",
          background: "#1a1a2e",
          border: "1px solid #2a2a4a",
          fontSize: "0.875rem",
          color: "#6b6b8a",
        }}
      >
        Backend API:{" "}
        <code style={{ color: "#a78bfa" }}>{API_URL}</code>
      </div>

      <p style={{ fontSize: "0.8rem", color: "#4a4a6a", marginTop: "2rem" }}>
        Phase 0 scaffold — dashboard coming in a later phase.
      </p>
    </main>
  );
}
