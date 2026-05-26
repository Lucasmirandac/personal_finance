"use client";

import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

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
      onClick={() => !disabled && inputRef.current?.click()}
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
      <div className="flex flex-col items-center gap-2">
        <UploadCloud size={22} className="text-[var(--muted)]" strokeWidth={1.75} />
        <div className="text-sm font-medium">
          Arraste um CSV ou clique para selecionar
        </div>
        <div className="text-[11px] subtle">
          Inter · Nubank — formato detectado automaticamente
        </div>
      </div>
    </div>
  );
}
