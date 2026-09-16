"use client";

import InstitutionalError from "../components/InstitutionalError";

export default function GlobalError({ retry }: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <head><title>Documentos — página indisponível</title></head>
      <body style={{ margin: 0 }}><InstitutionalError retry={retry} /></body>
    </html>
  );
}
