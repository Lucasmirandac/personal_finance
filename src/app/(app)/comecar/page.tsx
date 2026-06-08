"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Onboarding } from "@/components/Onboarding";
import { useAppStore } from "@/lib/store";
import { isProjectionReady } from "@/lib/setupStatus";

type WasReadyOnLoad = boolean | null;

export default function Home() {
  const { loaded, hasAnalysis, dataset, settings, accounts } = useAppStore();
  const router = useRouter();
  const [wasReadyOnLoad, setWasReadyOnLoad] = useState<WasReadyOnLoad>(null);

  useEffect(() => {
    if (!loaded) return;
    if (wasReadyOnLoad === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWasReadyOnLoad(hasAnalysis);
      return;
    }
    if (!wasReadyOnLoad) return;
    if (!hasAnalysis) return;
    if (isProjectionReady(dataset, settings, accounts)) {
      router.replace("/saldo");
    } else {
      router.replace("/dashboard");
    }
  }, [loaded, hasAnalysis, wasReadyOnLoad, dataset, settings, accounts, router]);

  if (!loaded || wasReadyOnLoad === null) {
    return <div className="text-muted">Carregando…</div>;
  }

  if (!wasReadyOnLoad) {
    return <Onboarding />;
  }

  if (!hasAnalysis) {
    return <Onboarding />;
  }

  return <div className="text-muted">Redirecionando…</div>;
}
