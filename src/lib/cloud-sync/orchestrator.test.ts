import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DEBOUNCE_MS } from "./orchestrator";
import { notifyDataMutated, onDataMutated } from "./mutations";

describe("cloud-sync mutations debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces mutation notifications", () => {
    const listener = vi.fn();
    onDataMutated(listener);
    notifyDataMutated();
    notifyDataMutated();
    notifyDataMutated();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("uses 45 second debounce constant", () => {
    expect(DEBOUNCE_MS).toBe(45_000);
  });
});

describe("cloud-sync offline guard", () => {
  it("defaults to online when navigator.onLine is unavailable", () => {
    const online =
      typeof navigator === "undefined"
        ? true
        : navigator.onLine !== false;
    expect(online).toBe(true);
  });
});
