import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/lib/tools";
import ToolWorkbench from "@/components/tools/ToolWorkbench";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  return {
    title: tool?.title || "Ferramenta",
    description: tool?.description,
  };
}

export default async function FerramentaPage({ params }: Props) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool || !tool.href.includes(`/ferramentas/${slug}`)) {
    notFound();
  }
  return <ToolWorkbench tool={tool} />;
}
