import type { Metadata } from "next";
import PdfImageApp from "@/components/pdf/PdfImageApp";

export const metadata: Metadata = {
  title: "JPG para PDF",
  description: "Converta imagens JPG, PNG e outras para PDF.",
};

export default function JpgParaPdfPage() {
  return <PdfImageApp mode="jpg-to-pdf" />;
}
