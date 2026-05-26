"use client";

import clsx from "clsx";
import { useCallback, useRef, useState } from "react";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function Dropzone({ onFile, disabled }: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const f = files[0];
      if (!f.name.toLowerCase().endsWith(".csv")) {
        alert("Selecione um arquivo .csv");
        return;
      }
      onFile(f);
    },
    [onFile],
  );

  return (
    <div
      className={clsx("dropzone", drag && "drag-active")}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xl">
          📥
        </div>
        <div>
          <div className="font-medium">
            Arraste seu CSV aqui ou clique para selecionar
          </div>
          <div className="text-sm subtle mt-1">
            Formato esperado: colunas <code>Data</code>,{" "}
            <code>Lançamento</code>, <code>Categoria</code>, <code>Tipo</code>,{" "}
            <code>Valor</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
