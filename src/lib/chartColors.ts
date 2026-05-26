/** CSS variable names for the categorical chart palette (8 colors, cycles). */
export const CATEGORY_COLOR_VARS = [
  "--cat-1",
  "--cat-2",
  "--cat-3",
  "--cat-4",
  "--cat-5",
  "--cat-6",
  "--cat-7",
  "--cat-8",
] as const;

export function categoryColor(index: number): string {
  const v = CATEGORY_COLOR_VARS[index % CATEGORY_COLOR_VARS.length];
  return `var(${v})`;
}

/** Resolve category colors from document (client-only). */
export function resolveCategoryColors(count: number): string[] {
  if (typeof document === "undefined") {
    return Array.from({ length: count }, (_, i) => categoryColor(i));
  }
  const root = document.documentElement;
  return Array.from({ length: count }, (_, i) => {
    const v = CATEGORY_COLOR_VARS[i % CATEGORY_COLOR_VARS.length];
    return getComputedStyle(root).getPropertyValue(v).trim() || categoryColor(i);
  });
}
