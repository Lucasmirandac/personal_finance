"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Onboarding } from "@/components/Onboarding";
import { useAppStore } from "@/lib/store";
import { isProjectionReady } from "@/lib/setupStatus";

export default function Home() {
  const { loaded, hasAnalysis, dataset, settings } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (!loaded) return;
    if (!hasAnalysis) return;
    if (isProjectionReady(dataset, settings)) {
      router.replace("/saldo");
    } else {
      router.replace("/dashboard");
    }
  }, [loaded, hasAnalysis, dataset, settings, router]);

  if (!loaded) {
    return <div className="subtle">Carregando…</div>;
  }

  if (!hasAnalysis) {
    return <Onboarding />;
  }

  return <div className="subtle">Redirecionando…</div>;
}
