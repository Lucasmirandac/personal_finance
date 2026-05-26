import { Suspense } from "react";
import ConfigPageInner from "./ConfigPageInner";

export default function ConfigPage() {
  return (
    <Suspense fallback={<div className="subtle">Carregando…</div>}>
      <ConfigPageInner />
    </Suspense>
  );
}
