"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

const MIN_SPLASH_MS = 450;

export function LaunchSplash() {
  const { loaded } = useAppStore();
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!loaded) return;

    const fadeTimer = window.setTimeout(() => setFadeOut(true), MIN_SPLASH_MS);
    const hideTimer = window.setTimeout(
      () => setVisible(false),
      MIN_SPLASH_MS + 280,
    );

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [loaded]);

  if (!visible) return null;

  return (
    <div
      aria-hidden={fadeOut}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5 px-8 text-center animate-[splash-rise_520ms_ease-out]">
        <div className="relative">
          <div className="absolute inset-0 rounded-[28px] bg-accent/15 blur-2xl scale-125" />
          <Image
            src="/logo.png"
            alt=""
            width={96}
            height={96}
            priority
            className="relative rounded-[22px] shadow-[var(--shadow-card-lg)]"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Saldo Real
          </p>
          <p className="text-sm text-muted">Finanças locais e privadas</p>
        </div>
      </div>
    </div>
  );
}
