import Link from "next/link";

export function EmptyState({
  title = "Nenhum dataset carregado",
  description = "Importe um CSV na página inicial para começar a análise.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="card p-10 text-center max-w-xl mx-auto">
      <div className="text-3xl">📄</div>
      <h2 className="text-lg font-semibold mt-3">{title}</h2>
      <p className="subtle mt-1">{description}</p>
      <Link href="/" className="btn btn-primary mt-4 inline-flex">
        Ir para importação
      </Link>
    </div>
  );
}
