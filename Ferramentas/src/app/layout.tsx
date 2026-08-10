import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import SemitNavbar from "@/components/layout/SemitNavbar";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Caixa de Ferramentas do MITI",
    template: "%s · Caixa de Ferramentas do MITI",
  },
  description:
    "Plataforma do MITI com ferramentas digitais para conversão e tratamento de documentos e imagens.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b4ea0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={rubik.variable}>
      <body>
        <SemitNavbar />
        {children}
      </body>
    </html>
  );
}
