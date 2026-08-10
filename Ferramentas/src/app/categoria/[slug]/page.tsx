import { notFound } from "next/navigation";
import CategoryTools from "@/components/hub/CategoryTools";
import { getCategoryBySlug, getToolsByCategory } from "@/lib/tools";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const tools = getToolsByCategory(category.id);
  return <CategoryTools category={category} tools={tools} />;
}
