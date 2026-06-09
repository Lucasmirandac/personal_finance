import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { GuideLayout } from "@/components/marketing/MarketingLayouts";

export const metadata: Metadata = {
  title: "Como reservar para poupar — guia Saldo Real",
  description:
    "Aprenda a definir uma reserva mensal antes do gasto do dia a dia, ver o efeito no limite diário e na projeção de patrimônio — tudo local no navegador.",
  alternates: { canonical: "/guias/como-poupar" },
};

export default function GuiaPouparPage() {
  return (
    <MarketingShell pageId="guide_poupar">
      <GuideLayout
        pageId="guide_poupar"
        title="Como reservar para poupar"
        description="Defina quanto da sua renda disponível guardar todo mês. A reserva reduz o limite diário e alimenta a Projeção de Paz Futura — sem planilha e sem enviar dados."
        updatedAt="junho de 2026"
        ctaTitle="Pronto para definir sua reserva?"
        ctaDescription="Abra o Saldo Real, cadastre receitas e custos fixos e configure a reserva no painel de saldo."
        ctaLabel="Começar no app"
      >
        <section>
          <h2>Por que reservar antes de gastar</h2>
          <p>
            Muita gente tenta poupar o que sobra no fim do mês — e sobra pouco ou
            nada. Reservar um valor (ou percentual) da renda disponível{" "}
            <strong>antes</strong> de calcular quanto pode gastar por dia alinha
            intenção e limite diário.
          </p>
          <p>
            No Saldo Real, a reserva não fica escondida em outra planilha: ela
            entra direto no painel de saldo e na projeção de patrimônio a 12
            meses.
          </p>
        </section>

        <section>
          <h2>O que é renda disponível</h2>
          <p>
            Renda disponível é o que sobra depois dos custos fixos do mês:
            receitas recorrentes menos aluguel, condomínio, assinaturas e
            compromissos que não mudam fácil.
          </p>
          <p>
            Fórmula: <strong>renda mensal − custos fixos = renda disponível</strong>.
          </p>
          <p>
            No app, cadastre receitas e despesas em{" "}
            <Link href="/recorrentes">Recorrentes</Link>. Para simular com
            números genéricos, use o{" "}
            <Link href="/ferramentas/reserva-poupar">simulador de reserva</Link>.
          </p>
        </section>

        <section>
          <h2>Percentual vs valor fixo</h2>
          <p>Você pode definir a reserva de duas formas:</p>
          <ul>
            <li>
              <strong>Percentual (5–80%):</strong> guarda uma fração da renda
              disponível — por exemplo, 20% de R$ 8.000 = R$ 1.600 por mês.
            </li>
            <li>
              <strong>Valor fixo:</strong> reserva um valor em reais todo mês —
              útil quando você já sabe quanto quer transferir para poupança.
            </li>
          </ul>
          <p>
            A reserva nunca pode ser maior que a renda disponível. Se o valor
            fixo exceder, o app limita ao máximo possível.
          </p>
        </section>

        <section>
          <h2>Como configurar no Saldo Real</h2>
          <ol>
            <li>
              Abra o app em <Link href="/comecar">/comecar</Link> e conclua o
              onboarding com contas e recorrentes.
            </li>
            <li>
              Em <Link href="/saldo">Saldo</Link>, localize o painel{" "}
              <strong>Reservado para poupar</strong> (ou &quot;Definir
              reserva&quot; se ainda não configurou).
            </li>
            <li>
              Escolha percentual ou valor fixo, confira o aporte mensal na
              pré-visualização e salve.
            </li>
            <li>
              Para ver patrimônio projetado e meses de tranquilidade, acesse{" "}
              <Link href="/dashboard?tab=patrimonio">Dashboard → Patrimônio</Link>.
            </li>
          </ol>
        </section>

        <section>
          <h2>Efeito no limite diário</h2>
          <p>
            Depois de reservar, o limite diário considera gastos já feitos,
            fatura aberta e a reserva:
          </p>
          <p>
            <strong>
              sobra do mês = renda disponível − gastos variáveis − fatura aberta
              − aporte mensal
            </strong>
          </p>
          <p>
            O limite diário divide essa sobra pelos dias restantes do mês. Assim,
            você sabe quanto pode gastar hoje <em>já descontando</em> o que
            pretende poupar.
          </p>
        </section>

        <section>
          <h2>Problemas comuns</h2>
          <ul>
            <li>
              <strong>Limite diário zerado:</strong> a reserva + gastos + fatura
              consomem toda a renda disponível. Reduza o percentual, ajuste
              custos fixos ou revise gastos já lançados.
            </li>
            <li>
              <strong>Reserva alta demais:</strong> comece com 10–20% e ajuste
              depois de uma ou duas semanas observando o painel.
            </li>
            <li>
              <strong>Renda disponível zero:</strong> cadastre receitas e custos
              fixos em Recorrentes — sem isso, não há base para calcular a
              reserva.
            </li>
            <li>
              <strong>Confusão com conta poupança:</strong> a reserva é um
              compromisso mensal no orçamento, não um tipo de conta bancária.
              Você pode ter uma conta &quot;Poupança&quot; no app e, ao mesmo
              tempo, definir quanto reservar da renda disponível.
            </li>
          </ul>
        </section>

        <section>
          <h2>Ver também</h2>
          <ul>
            <li>
              <Link href="/ferramentas/reserva-poupar">
                Simulador de reserva para poupar
              </Link>
            </li>
            <li>
              <Link href="/ferramentas/limite-diario">
                Calculadora de limite diário
              </Link>
            </li>
            <li>
              <Link href="/ferramentas/posso-comprar">
                Simulador posso comprar?
              </Link>
            </li>
            <li>
              <Link href="/guias/importar-nubank">Guia de importação Nubank</Link>
            </li>
            <li>
              <Link href="/guias/importar-inter">Guia de importação Inter</Link>
            </li>
          </ul>
        </section>
      </GuideLayout>
    </MarketingShell>
  );
}
