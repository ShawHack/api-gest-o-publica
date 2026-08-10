import type { Metadata } from "next";
import PdfTextEditor from "@/components/pdf/PdfTextEditor";

export const metadata: Metadata = {
  title: "Editar PDF",
  description: "Abra um PDF e edite o texto detectado nas páginas.",
};

export default function EditarPdfPage() {
  return <PdfTextEditor />;
}
