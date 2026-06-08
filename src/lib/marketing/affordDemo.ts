import { AFFORD_SEMAFORO_COPY, type AffordResult } from "@/lib/afford";

export type AffordLiteInput = {
  valor: number;
  parcelas: number;
  rendaDisponivel: number;
  saldoAtual: number;
  orcamentoMensalRestante?: number;
};

export type AffordLiteResult = {
  semaforo: AffordResult["semaforo"];
  motivos: string[];
  valorParcela: number;
  totalParcelado: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function simulateAffordLite(input: AffordLiteInput): AffordLiteResult | null {
  const valor = input.valor;
  const parcelas = Math.max(1, Math.min(24, Math.floor(input.parcelas)));
  if (!Number.isFinite(valor) || valor <= 0) return null;

  const rendaDisponivel = Math.max(0, input.rendaDisponivel);
  const saldoAtual = input.saldoAtual;
  const valorParcela = round2(valor / parcelas);
  const motivos: string[] = [];
  let semaforo: AffordResult["semaforo"] = "verde";

  const setWorst = (next: AffordResult["semaforo"]) => {
    if (next === "vermelho") semaforo = "vermelho";
    else if (next === "amarelo" && semaforo !== "vermelho") semaforo = "amarelo";
  };

  if (saldoAtual - valor < 0) {
    setWorst("vermelho");
    motivos.push("O valor total comprometeria seu saldo atual.");
  } else if (saldoAtual - valor < saldoAtual * 0.15 && saldoAtual > 0) {
    setWorst("amarelo");
    motivos.push("O saldo ficaria com pouca margem após a compra.");
  }

  if (rendaDisponivel <= 0) {
    setWorst("vermelho");
    motivos.push("Sem renda disponível cadastrada para absorver a compra.");
  } else if (valorParcela > rendaDisponivel * 0.35) {
    setWorst("vermelho");
    motivos.push("A parcela mensal consome mais de 35% da renda disponível.");
  } else if (valorParcela > rendaDisponivel * 0.2) {
    setWorst("amarelo");
    motivos.push("A parcela mensal pesa mais de 20% da renda disponível.");
  }

  if (input.orcamentoMensalRestante != null && input.orcamentoMensalRestante >= 0) {
    if (valorParcela > input.orcamentoMensalRestante) {
      setWorst("vermelho");
      motivos.push("A parcela estoura o orçamento mensal informado.");
    } else if (valorParcela > input.orcamentoMensalRestante * 0.8) {
      setWorst("amarelo");
      motivos.push("A parcela usa quase todo o orçamento mensal restante.");
    }
  }

  if (motivos.length === 0) {
    motivos.push(AFFORD_SEMAFORO_COPY.verde.detail);
  }

  return {
    semaforo,
    motivos,
    valorParcela,
    totalParcelado: round2(valor),
  };
}
