"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { sanitizePagePath, trackPageView } from "@/lib/analytics";
import { subscribe } from "@/lib/consent";

export function useGAPageView(): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    function send() {
      const path = sanitizePagePath(pathname, searchParams);
      if (lastPath.current === path) return;
      lastPath.current = path;
      trackPageView(path);
    }

    send();
    return subscribe((status) => {
      if (status === "granted") {
        lastPath.current = null;
        send();
      }
    });
  }, [pathname, searchParams]);
}
