import { hasAnalyticsConsent } from "./consent";

declare global {
  interface Window {
    gtag?: (
      command: "config" | "consent" | "event" | "js",
      targetOrEvent: string | Date,
      params?: Record<string, unknown>,
    ) => void;
    dataLayer?: unknown[];
  }
}

/** Keys that must never appear in analytics payloads. */
const FORBIDDEN_PARAM_KEYS = new Set([
  "amount",
  "valor",
  "description",
  "descricao",
  "lancamento",
  "estabelecimento",
  "account",
  "conta",
  "categoria",
  "category",
  "balance",
  "saldo",
  "email",
  "name",
  "nome",
]);

export type CsvImportSource = "nubank" | "inter" | "generic" | "unknown";
export type RowsBucket = "0-50" | "51-200" | "201-1000" | "1000+";
export type CsvImportFailReason =
  | "parse_error"
  | "empty_file"
  | "unsupported_format"
  | "unknown";
export type BackupImportResult = "ok" | "partial" | "fail";
export type CountBucket = "1" | "2-5" | "6+";
export type QuickAddKind = "expense" | "income" | "transfer";
export type MarketingPageId =
  | "landing"
  | "guide_nubank"
  | "guide_inter"
  | "tool_limite_diario"
  | "tool_posso_comprar";
export type MarketingCta = "comecar" | "ferramenta" | "guia";
export type OnboardingStep =
  | "welcome"
  | "import"
  | "anchor"
  | "budget"
  | "done";

export type AnalyticsEvent =
  | { name: "onboarding_started" }
  | { name: "onboarding_step_completed"; step: OnboardingStep }
  | { name: "onboarding_completed" }
  | { name: "csv_import_attempted"; source: CsvImportSource }
  | { name: "csv_import_succeeded"; rows_bucket: RowsBucket }
  | { name: "csv_import_failed"; reason: CsvImportFailReason }
  | { name: "backup_exported"; version: number }
  | {
      name: "backup_imported";
      version: number;
      result: BackupImportResult;
    }
  | { name: "budget_created" }
  | { name: "budget_suggestion_accepted"; count_bucket: CountBucket }
  | { name: "month_closed" }
  | { name: "achievement_unlocked"; achievement_id: string }
  | { name: "quick_add_used"; kind: QuickAddKind }
  | { name: "consent_granted" }
  | { name: "consent_revoked" }
  | { name: "marketing_page_viewed"; page: MarketingPageId }
  | { name: "marketing_cta_clicked"; page: MarketingPageId; cta: MarketingCta }
  | { name: "marketing_tool_calculated"; tool: "limite_diario" | "posso_comprar" };

const ALLOWED_EVENT_NAMES = new Set<AnalyticsEvent["name"]>([
  "onboarding_started",
  "onboarding_step_completed",
  "onboarding_completed",
  "csv_import_attempted",
  "csv_import_succeeded",
  "csv_import_failed",
  "backup_exported",
  "backup_imported",
  "budget_created",
  "budget_suggestion_accepted",
  "month_closed",
  "achievement_unlocked",
  "quick_add_used",
  "consent_granted",
  "consent_revoked",
  "marketing_page_viewed",
  "marketing_cta_clicked",
  "marketing_tool_calculated",
]);

const ONBOARDING_STEPS = new Set<OnboardingStep>([
  "welcome",
  "import",
  "anchor",
  "budget",
  "done",
]);

const CSV_SOURCES = new Set<CsvImportSource>([
  "nubank",
  "inter",
  "generic",
  "unknown",
]);

const ROWS_BUCKETS = new Set<RowsBucket>([
  "0-50",
  "51-200",
  "201-1000",
  "1000+",
]);

const FAIL_REASONS = new Set<CsvImportFailReason>([
  "parse_error",
  "empty_file",
  "unsupported_format",
  "unknown",
]);

const IMPORT_RESULTS = new Set<BackupImportResult>(["ok", "partial", "fail"]);

const COUNT_BUCKETS = new Set<CountBucket>(["1", "2-5", "6+"]);

const QUICK_ADD_KINDS = new Set<QuickAddKind>([
  "expense",
  "income",
  "transfer",
]);

const MARKETING_PAGES = new Set<MarketingPageId>([
  "landing",
  "guide_nubank",
  "guide_inter",
  "tool_limite_diario",
  "tool_posso_comprar",
]);

const MARKETING_CTAS = new Set<MarketingCta>(["comecar", "ferramenta", "guia"]);

const MARKETING_TOOLS = new Set(["limite_diario", "posso_comprar"] as const);

export function getMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}

function hasForbiddenKeys(params: Record<string, unknown>): boolean {
  for (const key of Object.keys(params)) {
    if (FORBIDDEN_PARAM_KEYS.has(key.toLowerCase())) return true;
  }
  return false;
}

/** Validates event payload; returns GA params object or null if invalid. */
export function validateEventParams(
  event: AnalyticsEvent,
): Record<string, string | number> | null {
  const { name, ...rest } = event;
  const params = rest as Record<string, unknown>;

  if (!ALLOWED_EVENT_NAMES.has(name)) return null;
  if (Object.keys(params).length > 0 && hasForbiddenKeys(params)) return null;

  switch (name) {
    case "onboarding_started":
    case "onboarding_completed":
    case "budget_created":
    case "month_closed":
    case "consent_granted":
    case "consent_revoked":
      if (Object.keys(params).length > 0) return null;
      return {};

    case "onboarding_step_completed": {
      const step = params.step;
      if (typeof step !== "string" || !ONBOARDING_STEPS.has(step as OnboardingStep))
        return null;
      return { step };
    }

    case "csv_import_attempted": {
      const source = params.source;
      if (typeof source !== "string" || !CSV_SOURCES.has(source as CsvImportSource))
        return null;
      return { source };
    }

    case "csv_import_succeeded": {
      const rows_bucket = params.rows_bucket;
      if (
        typeof rows_bucket !== "string" ||
        !ROWS_BUCKETS.has(rows_bucket as RowsBucket)
      )
        return null;
      return { rows_bucket };
    }

    case "csv_import_failed": {
      const reason = params.reason;
      if (
        typeof reason !== "string" ||
        !FAIL_REASONS.has(reason as CsvImportFailReason)
      )
        return null;
      return { reason };
    }

    case "backup_exported": {
      const version = params.version;
      if (typeof version !== "number" || !Number.isInteger(version) || version < 0)
        return null;
      return { version };
    }

    case "backup_imported": {
      const version = params.version;
      const result = params.result;
      if (typeof version !== "number" || !Number.isInteger(version) || version < 0)
        return null;
      if (typeof result !== "string" || !IMPORT_RESULTS.has(result as BackupImportResult))
        return null;
      return { version, result };
    }

    case "budget_suggestion_accepted": {
      const count_bucket = params.count_bucket;
      if (
        typeof count_bucket !== "string" ||
        !COUNT_BUCKETS.has(count_bucket as CountBucket)
      )
        return null;
      return { count_bucket };
    }

    case "achievement_unlocked": {
      const achievement_id = params.achievement_id;
      if (typeof achievement_id !== "string" || achievement_id.length === 0)
        return null;
      if (/[^a-z0-9-]/.test(achievement_id)) return null;
      return { achievement_id };
    }

    case "quick_add_used": {
      const kind = params.kind;
      if (typeof kind !== "string" || !QUICK_ADD_KINDS.has(kind as QuickAddKind))
        return null;
      return { kind };
    }

    case "marketing_page_viewed": {
      const page = params.page;
      if (typeof page !== "string" || !MARKETING_PAGES.has(page as MarketingPageId))
        return null;
      return { page };
    }

    case "marketing_cta_clicked": {
      const page = params.page;
      const cta = params.cta;
      if (typeof page !== "string" || !MARKETING_PAGES.has(page as MarketingPageId))
        return null;
      if (typeof cta !== "string" || !MARKETING_CTAS.has(cta as MarketingCta))
        return null;
      return { page, cta };
    }

    case "marketing_tool_calculated": {
      const tool = params.tool;
      if (
        typeof tool !== "string" ||
        !MARKETING_TOOLS.has(tool as "limite_diario" | "posso_comprar")
      )
        return null;
      return { tool };
    }

    default:
      return null;
  }
}

function canSend(): boolean {
  return (
    typeof window !== "undefined" &&
    hasAnalyticsConsent() &&
    !!getMeasurementId() &&
    typeof window.gtag === "function"
  );
}

export function trackEvent(event: AnalyticsEvent): void {
  const params = validateEventParams(event);
  if (params === null) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] rejected event", event);
    }
    return;
  }

  if (!hasAnalyticsConsent() || !getMeasurementId()) return;

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics] event", event.name, params);
    if (!canSend()) return;
  } else if (!canSend()) {
    return;
  }

  window.gtag!("event", event.name, params);
}

/** Whitelisted query params for page paths. */
const ALLOWED_QUERY_KEYS = new Set(["tab"]);

export function sanitizePagePath(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const allowed = new URLSearchParams();
  for (const key of ALLOWED_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value) allowed.set(key, value);
  }
  const qs = allowed.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function trackPageView(pagePath: string): void {
  const id = getMeasurementId();
  if (!hasAnalyticsConsent() || !id) return;

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics] page_view", pagePath);
    if (!canSend()) return;
  } else if (!canSend()) {
    return;
  }

  window.gtag!("config", id, {
    page_path: pagePath,
  });
}

export function updateGtagConsentDenied(): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: "denied",
  });
}
