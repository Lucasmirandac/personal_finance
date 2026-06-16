"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function OAuthCallbackInner() {
  const searchParams = useSearchParams();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error =
      searchParams.get("error_description") ?? searchParams.get("error");

    if (window.opener) {
      window.opener.postMessage(
        {
          type: "saldoreal-oauth-callback",
          code: code ?? undefined,
          state: state ?? undefined,
          error: error ?? undefined,
        },
        window.location.origin,
      );
      setDone(true);
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted">
      {done
        ? "Autorização concluída. Esta janela pode ser fechada."
        : "Processando autorização…"}
    </div>
  );
}
