import Link from "next/link";

export function EmptyState({
  title = "Nenhum dado para analisar",
  description = "Comece importando um CSV ou cadastrando recorrentes.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="card p-10 text-center max-w-xl mx-auto">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="subtle mt-1">{description}</p>
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        <Link href="/" className="btn btn-primary">
          Começar
        </Link>
        <Link href="/config?tab=importar" className="btn">
          Importar CSV
        </Link>
      </div>
    </div>
  );
}
