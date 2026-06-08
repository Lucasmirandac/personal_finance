import { Suspense } from "react";
import ConfigPageInner from "./ConfigPageInner";

export default function ConfigPage() {
  return (
    <Suspense fallback={<div className="text-muted">Carregando…</div>}>
      <ConfigPageInner />
    </Suspense>
  );
}
