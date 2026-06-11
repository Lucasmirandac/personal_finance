/**
 * Central glossary for InfoTip tooltips across Saldo Real.
 * Keep entries short (1–2 sentences), plain Portuguese.
 */
export const GLOSSARY = {
  // Saldo / projeção
  saldoAtual:
    "Saldo de caixa projetado para hoje: ponto de partida das contas mais lançamentos de conta até esta data.",
  saldoDiario:
    "Quanto você ainda pode gastar por dia até o fim do mês, depois de renda disponível, gastos variáveis e faturas de cartão em aberto.",
  rendaDisponivel:
    "Renda mensal recorrente menos despesas fixas (aluguel, assinaturas etc.). É a base do orçamento do mês.",
  sobraDoMes:
    "O que sobra da renda disponível após gastos variáveis e faturas de cartão já comprometidas neste mês.",
  jaGasto:
    "Soma do gasto variável do mês (compras, saídas de conta) mais o total das faturas de cartão ainda não pagas.",
  menorSaldo:
    "Menor saldo de caixa previsto no horizonte da projeção — ajuda a ver se o dinheiro pode ficar negativo.",
  proximoCompromisso:
    "Próxima saída de caixa prevista (fatura, despesa fixa, parcela etc.), com valor e data.",
  saldo7d: "Saldo de caixa projetado daqui a 7 dias, com base nos eventos futuros conhecidos.",
  saldo30d: "Saldo de caixa projetado daqui a 30 dias.",
  saldo90d: "Saldo de caixa projetado daqui a 90 dias.",
  entradas: "Soma das entradas de caixa previstas a partir de hoje (salário, receitas recorrentes etc.).",
  saidas:
    "Soma das saídas de caixa previstas a partir de hoje (faturas, despesas fixas, parcelas). O valor é mostrado em positivo.",
  tetoCartao:
    "Quanto ainda dá para gastar no cartão neste mês sem comprometer o orçamento: renda disponível menos a fatura já em aberto (débito de ciclos anteriores).",
  tetoCartaoDefinido:
    "Valor máximo que você quer comprometer neste cartão em uma fatura. É um compromisso seu, não o limite bancário do cartão.",
  tetoCartaoUso:
    "Quanto da fatura em foco já foi consumido em relação ao teto que você definiu para este cartão.",
  faturaAberta:
    "Total das faturas de cartão com pagamento ainda por vir — comprometem o caixa no dia do pagamento.",
  projecaoSaldo:
    "Curva do saldo de caixa dia a dia. Compras no cartão entram no dia do pagamento da fatura, não na compra.",
  contasResumo:
    "Soma dos saldos iniciais cadastrados nas contas ativas (inclui cartões com saldo zero).",
  dataReferencia:
    "Data em que o saldo inicial da conta foi informado. Lançamentos depois disso alteram a projeção.",
  mixedReferenceDates:
    "Contas de dinheiro atualizadas em datas diferentes podem misturar saldos de momentos distintos.",

  // Fechamento / orçamento
  fechamento:
    "Revisão de um mês passado: compara sobra ou déficit do mês e sugere ajustes nos orçamentos.",
  deficitMes: "Renda disponível do mês foi menor que gastos variáveis e faturas — ficou no negativo.",
  maisEstouraram: "Categorias que passaram de 100% do limite de orçamento naquele mês.",
  maisSobraram: "Categorias que usaram menos de 80% do orçamento — sobra de limite.",

  // Extrato / faturas / transações
  extrato:
    "Movimentos de conta corrente, carteira e poupança. Compras no cartão aparecem em Faturas.",
  faturas:
    "Compras agrupadas por cartão e ciclo de fatura (fechamento e pagamento).",
  faturaEmFoco: "Total das compras no ciclo de fatura selecionado.",
  comprasFatura: "Quantidade de compras incluídas no ciclo de fatura em foco.",
  faturaAbertaBadge: "Fatura com pagamento hoje ou no futuro — ainda não paga no caixa.",
  faturaFechadaBadge: "Fatura com data de pagamento já passada.",
  fechaDia:
    "Dia do mês em que a fatura fecha: compras depois disso entram na fatura seguinte.",
  pagamentoDia: "Dia em que o pagamento da fatura sai do seu caixa na projeção.",
  entradasExtrato: "Total de entradas de caixa no mês e filtros selecionados.",
  saidasExtrato: "Total de saídas de caixa no mês (valor negativo na soma interna).",
  saldoExtrato: "Entradas menos saídas no período filtrado.",
  aPagarExtrato:
    "Total das contas planejadas (fixas ou manuais) ainda não marcadas como pagas neste mês.",
  pago:
    "Conta planejada marcada como paga por você. Não altera o saldo projetado nesta versão.",
  aPagar:
    "Conta planejada marcada como pendente — ainda não foi paga.",
  vencida:
    "Conta planejada com vencimento passado e ainda marcada como não paga.",
  aConfirmar:
    "Conta planejada que venceu neste mês e ainda não foi confirmada. Toque para marcar se já pagou.",

  // Badges e classificação
  previsto:
    "Lançamento futuro ou estimado (recorrente do mês ou parcela projetada), ainda não confirmado no extrato.",
  recorrente:
    "Gerado por regra recorrente. Use Ajustar no extrato ou calendário para mudar só este mês; a regra completa fica em Recorrentes.",
  ajusteMensalRecorrente:
    "Muda só este mês. A regra em Recorrentes não muda.",
  editado: "Alterado localmente no app; o CSV ou registro original não foi modificado.",
  parcela: "Uma parte de uma compra parcelada no cartão.",
  parcelaEstimada: "Parcela futura estimada a partir de compras já conhecidas.",
  natureza:
    "Como o app classifica o lançamento: gasto, receita, pagamento de fatura, estorno etc.",
  valorOriginal: "Valor como importado ou digitado, antes das regras de análise.",
  valorAnalise:
    "Valor usado em totais e gráficos. Pagamentos de fatura e estornos costumam ser zero para não contar duas vezes.",
  pagamentoFatura:
    "Pagamento da fatura do cartão; não entra como gasto para não somar com as compras já contadas.",
  estorno: "Crédito ou estorno; tratado como neutro no consumo.",
  gasto: "Despesa que conta no consumo e nos totais de gasto.",
  despesaFixa: "Despesa recorrente fixa (ex.: aluguel).",
  receita: "Entrada de dinheiro classificada como receita.",
  faixaValor: "Agrupamento por tamanho do valor absoluto da transação.",
  ytd: "Year to date: do início do ano até a data mais recente dos seus dados.",

  // Dashboard
  ticketMedio: "Valor médio por transação de consumo no período filtrado.",
  totalBruto: "Soma de todos os valores antes de excluir pagamentos de fatura e estornos.",
  tx: "Número de transações (abreviação de transações).",
  shareDiaUtil: "Percentual do gasto que ocorreu em dias úteis (seg–sex).",
  shareFimSemana: "Percentual do gasto que ocorreu no fim de semana.",
  deltaAnterior: "Variação em relação ao mês anterior.",
  deltaAnoPassado: "Variação em relação ao mesmo mês do ano passado.",
  excluidos:
    "Lançamentos ignorados na análise de consumo (pagamentos de fatura, estornos).",
  gastoCartao:
    "Total de compras no cartão no período — não é o mesmo que saída de caixa no dia da compra.",

  // Patrimônio / futuro
  patrimonio: "Patrimônio ou reserva informada como ponto de partida da projeção de longo prazo.",
  patrimonioProjetado:
    "Estimativa de patrimônio após 12 meses, somando aportes à meta de poupança.",
  metaPoupanca:
    "Percentual ou valor fixo da renda disponível que você pretende poupar todo mês.",
  reservaMensal:
    "Parte da renda disponível comprometida com poupança antes do gasto do dia a dia.",
  aporte: "Valor mensal destinado à poupança conforme a meta.",
  tranquilidade:
    "Quantos meses de custos fixos o patrimônio projetado cobriria — indicador de folga.",
  alavancagem:
    "Proporção entre custos fixos e renda: quanto da renda já está comprometida com contas fixas.",
  custoFixo: "Despesas recorrentes fixas cadastradas (aluguel, planos etc.).",

  // Config / backup
  saldoInicial:
    "Saldo informado na data de referência; a projeção parte daqui e soma lançamentos depois.",
  horizonteProjecao: "Quantos dias à frente o app projeta saldo e eventos de caixa.",
  mediana:
    "Valor típico de gasto na categoria, menos sensível a um mês muito alto ou baixo.",
  mesAtipico: "Mês com gasto muito fora do padrão, excluído da sugestão de orçamento.",
  substituirTudo: "Apaga os dados locais atuais e usa só o backup importado.",
  mesclar:
    "Combina backup com dados locais; regras e edições mais recentes prevalecem onde aplicável.",

  // Modais
  saldoProjetadoHoje: "Saldo que o app calcula hoje com base nas contas e lançamentos.",
  diferencaSaldo: "Diferença entre o saldo real que você informou e o projetado pelo app.",
  orcamentoCategoria: "Quanto já gastou na categoria versus o limite mensal do orçamento.",
  simulacaoAfford:
    "Simula o impacto de uma compra na projeção e no orçamento — não cria lançamento.",
  evolucaoMensal:
    "Receitas, despesas e saldo líquido mês a mês no período filtrado.",
  transacoesPorMes: "Quantidade de transações de consumo em cada mês.",
  gastosPorDiaSemana: "Total gasto em cada dia da semana no período filtrado.",
  gastosPorCategoria: "Ranking das categorias com maior gasto no período.",
  projecaoPazFutura:
    "Simulação de patrimônio com base na renda disponível e na meta de poupança.",
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

/** Shorthand for tooltip content from the glossary. */
export function g(key: GlossaryKey): string {
  return GLOSSARY[key];
}
