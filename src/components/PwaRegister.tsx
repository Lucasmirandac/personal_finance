"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";

type PwaUpdateState = {
  waiting: ServiceWorker | null;
  offline: boolean;
};

export function PwaRegister() {
  const [update, setUpdate] = useState<PwaUpdateState>({
    waiting: null,
    offline: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") return;

    const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0";
    const swUrl = `/sw.js?version=${encodeURIComponent(version)}`;

    function setOffline() {
      setUpdate((prev) => ({ ...prev, offline: !navigator.onLine }));
    }

    setOffline();
    window.addEventListener("online", setOffline);
    window.addEventListener("offline", setOffline);

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register(swUrl, { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;

        if (reg.waiting) {
          setUpdate((prev) => ({ ...prev, waiting: reg.waiting }));
        }

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setUpdate((prev) => ({ ...prev, waiting: reg.waiting }));
            }
          });
        });
      })
      .catch(() => {
        /* SW unavailable in dev or unsupported context */
      });

    function onControllerChange() {
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.removeEventListener("online", setOffline);
      window.removeEventListener("offline", setOffline);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      void registration;
    };
  }, []);

  function applyUpdate() {
    update.waiting?.postMessage({ type: "SKIP_WAITING" });
  }

  if (!update.waiting && !update.offline) return null;

  return (
    <div
      className={clsx(
        "fixed bottom-20 sm:bottom-6 left-4 right-4 z-50 mx-auto max-w-lg",
        "rounded-2xl border border-border/70 bg-surface/95 backdrop-blur-xl",
        "shadow-[var(--shadow-card-lg)] px-4 py-3 flex items-center justify-between gap-3",
      )}
      role="status"
    >
      <p className="text-sm text-[var(--foreground)]">
        {update.waiting
          ? "Nova versão do Saldo Real disponível."
          : "Você está offline. Seus dados locais continuam disponíveis."}
      </p>
      {update.waiting ? (
        <Button type="button" size="sm" onClick={applyUpdate}>
          Atualizar app
        </Button>
      ) : null}
    </div>
  );
}
