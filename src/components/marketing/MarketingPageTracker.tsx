"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { MarketingPageId } from "@/lib/marketing/site";

type Props = {
  pageId: MarketingPageId;
};

export function MarketingPageTracker({ pageId }: Readonly<Props>) {
  useEffect(() => {
    trackEvent({ name: "marketing_page_viewed", page: pageId });
  }, [pageId]);

  return null;
}
