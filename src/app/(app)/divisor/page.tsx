"use client";

import { DivisorPageContent } from "@/components/divisor/DivisorPageContent";
import { useAppStore } from "@/lib/store";

export default function DivisorPage() {
  const { loaded } = useAppStore();

  if (!loaded) return <div className="text-muted">Carregando…</div>;

  return <DivisorPageContent />;
}
