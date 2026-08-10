import type { Metadata } from "next";
import RamaisSearch from "@/components/ramais/RamaisSearch";

export const metadata: Metadata = {
  title: "Ramais",
  description: "Pesquise ramais por número ou nome/setor e compartilhe no WhatsApp.",
};

export default function RamaisPage() {
  return <RamaisSearch />;
}
