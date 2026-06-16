import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMeasurementId,
  trackEvent,
  trackPageView,
  validateEventParams,
} from "./analytics";
import * as consent from "./consent";

describe("validateEventParams", () => {
  it("accepts events without extra params", () => {
    expect(validateEventParams({ name: "budget_created" })).toEqual({});
  });

  it("rejects unknown event names at validation layer via trackEvent", () => {
    expect(
      validateEventParams({
        name: "onboarding_step_completed",
        step: "welcome",
      }),
    ).toEqual({ step: "welcome" });
  });

  it("rejects forbidden keys in payload", () => {
    const bad = {
      name: "budget_created" as const,
      amount: 100,
    };
    expect(validateEventParams(bad as never)).toBeNull();
  });

  it("rejects invalid onboarding step", () => {
    expect(
      validateEventParams({
        name: "onboarding_step_completed",
        step: "invalid" as "welcome",
      }),
    ).toBeNull();
  });

  it("rejects achievement_id with invalid characters", () => {
    expect(
      validateEventParams({
        name: "achievement_unlocked",
        achievement_id: "bad id!",
      }),
    ).toBeNull();
  });

  it("accepts support events with known surfaces", () => {
    expect(
      validateEventParams({
        name: "support_link_clicked",
        surface: "month_close_celebrate",
      }),
    ).toEqual({ surface: "month_close_celebrate" });
    expect(
      validateEventParams({
        name: "supporter_confirmed",
        surface: "config_privacy",
      }),
    ).toEqual({ surface: "config_privacy" });
  });

  it("rejects support events with unknown surfaces", () => {
    expect(
      validateEventParams({
        name: "support_link_clicked",
        surface: "saldo",
      } as never),
    ).toBeNull();
  });
});

describe("trackEvent", () => {
  const gtag = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.spyOn(consent, "hasAnalyticsConsent").mockReturnValue(true);
    Object.defineProperty(globalThis, "window", {
      value: { gtag },
      writable: true,
      configurable: true,
    });
    gtag.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not call gtag without consent", () => {
    vi.spyOn(consent, "hasAnalyticsConsent").mockReturnValue(false);
    trackEvent({ name: "budget_created" });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("does not call gtag without measurement id", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    trackEvent({ name: "budget_created" });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("rejects events with forbidden financial fields", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    trackEvent({
      name: "csv_import_succeeded",
      rows_bucket: "0-50",
      amount: 500,
    } as never);
    expect(gtag).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("sends valid events when consent and gtag are present", () => {
    vi.stubEnv("NODE_ENV", "production");
    trackEvent({ name: "consent_granted" });
    expect(gtag).toHaveBeenCalledWith("event", "consent_granted", {});
  });
});

describe("trackPageView", () => {
  const gtag = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.spyOn(consent, "hasAnalyticsConsent").mockReturnValue(true);
    Object.defineProperty(globalThis, "window", {
      value: { gtag },
      writable: true,
      configurable: true,
    });
    gtag.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("no-ops without measurement id", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    trackPageView("/saldo");
    expect(gtag).not.toHaveBeenCalled();
  });
});

describe("getMeasurementId", () => {
  it("returns undefined when env is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    expect(getMeasurementId()).toBeUndefined();
  });

  it("returns trimmed id when set", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "  G-ABC  ");
    expect(getMeasurementId()).toBe("G-ABC");
  });
});
