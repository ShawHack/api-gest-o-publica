import type { Metadata } from "next";
import PdfImageApp from "@/components/pdf/PdfImageApp";

export const metadata: Metadata = {
  title: "PDF para JPG",
  description: "Converta páginas de PDF em imagens JPG.",
};

export default function PdfParaJpgPage() {
  return <PdfImageApp mode="pdf-to-jpg" />;
}
