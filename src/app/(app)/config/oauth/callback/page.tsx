import { Suspense } from "react";
import OAuthCallbackInner from "./OAuthCallbackInner";

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted">Processando…</div>}>
      <OAuthCallbackInner />
    </Suspense>
  );
}
