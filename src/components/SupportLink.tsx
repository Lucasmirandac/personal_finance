"use client";

import clsx from "clsx";
import { APOIA_SE_URL } from "@/lib/marketing/links";
import { trackEvent, type SupportLinkSurface } from "@/lib/analytics";

type Props = {
  surface: SupportLinkSurface;
  className?: string;
  children: React.ReactNode;
};

export function SupportLink({
  surface,
  className,
  children,
}: Readonly<Props>) {
  return (
    <a
      href={APOIA_SE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent({ name: "support_link_clicked", surface })}
      className={clsx(className)}
    >
      {children}
    </a>
  );
}
