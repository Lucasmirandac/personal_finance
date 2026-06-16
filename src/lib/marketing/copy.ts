/** Shared marketing copy — universal-first, CSV as optional accelerator. */

export const PRODUCT_PROMISE =
  "Controle financeiro local para qualquer banco. Veja saldo hoje, faturas e projeção — sem cadastro e sem enviar dados ao Saldo Real.";

export const HERO_SUBTITLE =
  "Cadastre contas, veja saldo hoje, faturas e projeção — tudo no dispositivo. Nada vai para servidores do Saldo Real.";

export const CSV_OPTIONAL_LINE =
  "Funciona com qualquer banco. Cadastre contas e lance gastos manualmente — ou importe CSV do Nubank e Inter para poupar digitação.";

export const TOOL_UPSELL_LINE =
  "Cadastre contas e lance gastos — ou importe CSV do Nubank/Inter para automatizar.";

export const BANKS_FAQ_ANSWER =
  "Qualquer banco via cadastro manual e Quick Add. Importação automática de CSV disponível para Nubank e Inter.";

export const JSON_LD_APP_DESCRIPTION =
  "Painel financeiro pessoal local-first com Hoje, Extrato, Faturas e Futuro. Limite diário, orçamentos, simulador Posso comprar? e sync criptografado opcional.";

export const LANDING_FAQ = [
  {
    q: "Meus dados ficam onde?",
    a: "No IndexedDB do seu navegador. Transações e saldos não passam pelos servidores do Saldo Real.",
  },
  {
    q: "Funciona em mais de um dispositivo?",
    a: "Sim. Exporte um backup JSON manualmente ou ative a sync criptografada no seu Google Drive ou Dropbox — opcional, e só você guarda a senha.",
  },
  {
    q: "O que vai para a nuvem?",
    a: "Por padrão, nada. Se você ativar a sync, apenas um arquivo criptografado vai para a sua conta no Drive ou Dropbox — o Saldo Real não tem acesso ao conteúdo.",
  },
  {
    q: "Funciona offline?",
    a: "Sim, como PWA. Depois de carregar, o painel funciona com seus dados locais.",
  },
  {
    q: "Quais bancos são suportados?",
    a: BANKS_FAQ_ANSWER,
  },
  {
    q: "Preciso criar conta?",
    a: "Não. Abra o app, cadastre conta e renda no onboarding e comece a usar.",
  },
  {
    q: "Posso reservar parte da renda para poupar?",
    a: "Sim. Defina um percentual ou valor fixo da renda disponível — a reserva reduz o limite diário e entra na projeção de patrimônio. Tudo fica no navegador.",
  },
] as const;
