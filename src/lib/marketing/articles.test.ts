import { describe, expect, it } from "vitest";
import {
  getAllArticles,
  getArticleBySlug,
  getArticlePaths,
} from "./articles";

describe("articles registry", () => {
  it("returns article by slug", () => {
    const article = getArticleBySlug("por-que-gastamos-ego-financas");
    expect(article?.title).toContain("ego");
    expect(article?.pageId).toBe("article_ego_gastos");
  });

  it("returns undefined for unknown slug", () => {
    expect(getArticleBySlug("inexistente")).toBeUndefined();
  });

  it("lists articles newest first", () => {
    expect(getAllArticles().length).toBeGreaterThan(0);
  });

  it("builds sitemap paths", () => {
    expect(getArticlePaths()).toContain(
      "/artigos/por-que-gastamos-ego-financas",
    );
  });
});
