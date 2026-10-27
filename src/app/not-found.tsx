import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6 py-16">
      <p className="text-caption font-semibold uppercase tracking-wider text-muted">
        Página não encontrada
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Esse endereço não existe.
      </h1>
      <p className="text-sm leading-relaxed text-muted">
        Volte ao início ou leia como o Saldo Real trata seus dados.
      </p>
      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-surface"
        >
          Ir para o início
        </Link>
        <Link
          href="/privacidade"
          className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium"
        >
          Privacidade
        </Link>
        <Link
          href="/comecar"
          className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium"
        >
          Abrir o app
        </Link>
      </div>
    </div>
  );
}
