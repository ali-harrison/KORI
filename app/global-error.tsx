"use client";

import { useEffect } from "react";

// Root-level catch-all — only fires when something above every other
// error.tsx boundary crashes (e.g. app/layout.tsx or app/dashboard/
// layout.tsx's own data fetching, which app/dashboard/error.tsx can't
// catch since a boundary never covers its own segment's layout). Next
// requires this to render its own <html>/<body> since it replaces the
// entire root layout — kept deliberately self-contained (no component
// imports, no next/font) rather than reusing the design system, since
// whatever crashed might be something this file would otherwise depend on.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0d0b",
          color: "#ece7df",
          fontFamily: "-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Something went wrong</p>
          <p style={{ fontSize: 13, color: "#8f897f", marginBottom: 20 }}>
            Unexpected error loading the app. Try again, or reload the page.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#161411",
              color: "#ece7df",
              border: "1px solid #4a4640",
              borderRadius: 2,
              padding: "7px 14px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
