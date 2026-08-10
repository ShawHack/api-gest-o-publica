import type { Metadata } from "next";
import ConverterApp from "@/components/converter/ConverterApp";

export const metadata: Metadata = {
  title: "Conversor de Imagens",
  description:
    "Converta imagens entre formatos com qualidade, rapidez e processamento em lote.",
};

export default function ConversorPage() {
  return <ConverterApp />;
}
