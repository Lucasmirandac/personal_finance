# Search Console e funil orgânico

Configure após deploy em produção (`https://saldoreal.app` ou `NEXT_PUBLIC_SITE_URL`).

## Search Console

1. Acesse [Google Search Console](https://search.google.com/search-console).
2. Adicione a propriedade do domínio ou prefixo de URL do site.
3. Verifique propriedade (DNS TXT ou arquivo HTML — Vercel facilita via meta tag se necessário).
4. Envie o sitemap: `https://SEU_DOMINIO/sitemap.xml`
5. Monitore indexação das URLs públicas:
   - `/`
   - `/comecar`
   - `/ferramentas/limite-diario`
   - `/ferramentas/posso-comprar`
   - `/guias/importar-nubank`
   - `/guias/importar-inter`

## Variável de ambiente

```bash
NEXT_PUBLIC_SITE_URL=https://saldoreal.app
```

Usada em `metadataBase`, sitemap, robots e JSON-LD.

## GA4 — eventos do funil público

Com consentimento analytics ativo (`NEXT_PUBLIC_GA_MEASUREMENT_ID`), o app emite:

| Evento | Quando |
|--------|--------|
| `marketing_page_viewed` | Visita a landing, guia ou ferramenta (`page`: landing, guide_nubank, …) |
| `marketing_cta_clicked` | Clique em CTA (`cta`: comecar, ferramenta, guia) |
| `marketing_tool_calculated` | Submit das calculadoras (`tool`: limite_diario, posso_comprar) |

Parâmetros são validados em [`src/lib/analytics.ts`](../src/lib/analytics.ts) — sem valores financeiros.

## Funil sugerido no GA4

1. `marketing_page_viewed` (page = landing | tool_* | guide_*)
2. `marketing_cta_clicked` (cta = comecar)
3. `onboarding_started`
4. `onboarding_completed`

Crie um explorador de funil ou relatório customizado cruzando esses eventos.

## Vercel Analytics

`@vercel/analytics` já está no layout raiz — complementa GA4 com pageviews agregadas (sem dados financeiros).
