# Decisões — Google Analytics 4 (opt-in LGPD)

**Data:** 2026-06-02

## Por que GA4 ao lado do Vercel Analytics

- **Vercel Analytics** já cobre pageviews agregados na hospedagem; permanece ativo.
- **GA4** entra para funis de produto (onboarding, import, backup, orçamentos) com taxonomia controlada no código.

## Modelo de consentimento

- **Opt-in explícito** (default OFF). Banner na primeira visita; persistência em `localStorage` (`saldoreal:consent:v1`).
- GA4 só injeta scripts após `granted`. Revogação chama `gtag('consent', 'update', { analytics_storage: 'denied' })` e orienta recarregar a página.
- LGPD: mesmo em modo cookieless há transferência internacional de IP — por isso o aceite ativo é obrigatório.

## Configuração técnica

- Env: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- Cookieless: `client_storage: 'none'`, `anonymize_ip: true`
- Desabilitado: `allow_google_signals`, `allow_ad_personalization_signals`
- Wrapper: [`src/lib/analytics.ts`](../../src/lib/analytics.ts) — union de eventos + validador runtime de chaves proibidas

## Campos proibidos (nunca enviar)

`amount`, `valor`, `description`, `lancamento`, `estabelecimento`, `account`, `conta`, `categoria`, `balance`, `saldo`, `email`, `name`, `nome`, e qualquer texto livre do usuário.

## Eventos de apoio ao projeto

- `support_link_clicked`: registra apenas a superfície do link Apoia.se (`landing_section`, `marketing_footer`, `app_footer`, `config_privacy`, `month_close_card`, `month_close_celebrate`).
- `supporter_confirmed`: registra apenas onde o usuário confirmou localmente que apoia o projeto (`config_privacy` ou `month_close_celebrate`).

Esses eventos não incluem valores, identificação do usuário, dados financeiros nem status real de pagamento no Apoia.se.

## CSP (futuro)

Se Content-Security-Policy for adicionada, permitir:

- `https://www.googletagmanager.com`
- `https://www.google-analytics.com`

## Service Worker

Validar em smoke manual que o SW do PWA não cacheia nem bloqueia requisições GA.

## Revisão

Revisar taxonomia e copy de privacidade a cada release que adicione novos eventos ou coleta de dados.
