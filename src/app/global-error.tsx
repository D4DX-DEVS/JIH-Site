"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", color: "#0b1233" }}>
        <h1 style={{ fontSize: "2rem" }}>Something went wrong</h1>
        <p>The site could not be displayed. Please try again.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.75rem 1.25rem", background: "#071e7f", color: "#fff", border: 0 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
