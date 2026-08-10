export type ToolStatus = "available" | "soon";

export type ToolCategoryId = "documentos" | "imagens";

export type ToolKind =
  | "image-convert"
  | "jpg-to-pdf"
  | "pdf-to-jpg"
  | "pdf-merge"
  | "pdf-split"
  | "pdf-compress"
  | "pdf-to-word"
  | "pdf-to-ppt"
  | "pdf-to-excel"
  | "word-to-pdf"
  | "ppt-to-pdf"
  | "excel-to-pdf"
  | "pdf-edit"
  | "pdf-sign"
  | "pdf-watermark"
  | "pdf-rotate"
  | "html-to-pdf"
  | "pdf-unlock"
  | "pdf-protect";

export type ToolCard = {
  id: string;
  kind: ToolKind;
  category: ToolCategoryId;
  title: string;
  description: string;
  href: string;
  status: ToolStatus;
  accent: string;
  accept: string;
  multiple: boolean;
  icon: string;
};

export type CategoryCard = {
  id: ToolCategoryId;
  slug: string;
  title: string;
  description: string;
  href: string;
  accent: string;
  icon: string;
};

/** Cards da tela principal (categorias). */
export const CATEGORIES: CategoryCard[] = [
  {
    id: "documentos",
    slug: "editar-documento",
    title: "Editar documento",
    description:
      "Junte, divida, comprima, converta, assine e proteja PDFs e arquivos Office.",
    href: "/categoria/editar-documento",
    accent: "#e74c3c",
    icon: "docs",
  },
  {
    id: "imagens",
    slug: "editar-imagens",
    title: "Editar imagens",
    description:
      "Converta imagens entre formatos e transforme JPG/PNG em PDF (e o inverso).",
    href: "/categoria/editar-imagens",
    accent: "#3b4ea0",
    icon: "images",
  },
];

export const TOOLS: ToolCard[] = [
  {
    id: "juntar-pdf",
    kind: "pdf-merge",
    category: "documentos",
    title: "Juntar PDF",
    description: "Mescla vários PDFs em um único documento, na ordem que você definir.",
    href: "/ferramentas/juntar-pdf",
    status: "available",
    accent: "#e74c3c",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "merge",
  },
  {
    id: "dividir-pdf",
    kind: "pdf-split",
    category: "documentos",
    title: "Dividir PDF",
    description: "Separe páginas de um PDF em arquivos individuais ou em intervalos.",
    href: "/ferramentas/dividir-pdf",
    status: "available",
    accent: "#e74c3c",
    accept: ".pdf,application/pdf",
    multiple: false,
    icon: "split",
  },
  {
    id: "comprimir-pdf",
    kind: "pdf-compress",
    category: "documentos",
    title: "Comprimir PDF",
    description: "Reduza o tamanho do PDF com recompressão controlada das páginas.",
    href: "/ferramentas/comprimir-pdf",
    status: "available",
    accent: "#e74c3c",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "compress",
  },
  {
    id: "pdf-para-word",
    kind: "pdf-to-word",
    category: "documentos",
    title: "PDF para Word",
    description: "Converta PDF em documento Word (.docx) editável.",
    href: "/ferramentas/pdf-para-word",
    status: "available",
    accent: "#2b579a",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "word",
  },
  {
    id: "pdf-para-powerpoint",
    kind: "pdf-to-ppt",
    category: "documentos",
    title: "PDF para PowerPoint",
    description: "Transforme páginas do PDF em slides PowerPoint (.pptx).",
    href: "/ferramentas/pdf-para-powerpoint",
    status: "available",
    accent: "#c43e1c",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "ppt",
  },
  {
    id: "pdf-para-excel",
    kind: "pdf-to-excel",
    category: "documentos",
    title: "PDF para Excel",
    description: "Extraia tabelas e textos do PDF para planilha Excel (.xlsx).",
    href: "/ferramentas/pdf-para-excel",
    status: "available",
    accent: "#217346",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "excel",
  },
  {
    id: "word-para-pdf",
    kind: "word-to-pdf",
    category: "documentos",
    title: "Word para PDF",
    description: "Converta documentos Word (.doc, .docx) para PDF.",
    href: "/ferramentas/word-para-pdf",
    status: "available",
    accent: "#2b579a",
    accept:
      ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    multiple: true,
    icon: "word",
  },
  {
    id: "powerpoint-para-pdf",
    kind: "ppt-to-pdf",
    category: "documentos",
    title: "PowerPoint para PDF",
    description: "Converta apresentações PowerPoint (.ppt, .pptx) para PDF.",
    href: "/ferramentas/powerpoint-para-pdf",
    status: "available",
    accent: "#c43e1c",
    accept:
      ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    multiple: true,
    icon: "ppt",
  },
  {
    id: "excel-para-pdf",
    kind: "excel-to-pdf",
    category: "documentos",
    title: "Excel para PDF",
    description: "Converta planilhas Excel (.xls, .xlsx) para PDF.",
    href: "/ferramentas/excel-para-pdf",
    status: "available",
    accent: "#217346",
    accept:
      ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    multiple: true,
    icon: "excel",
  },
  {
    id: "editar-pdf",
    kind: "pdf-edit",
    category: "documentos",
    title: "Editar PDF",
    description: "Abra o PDF na tela e edite o texto detectado nas páginas.",
    href: "/editar-pdf",
    status: "available",
    accent: "#8e44ad",
    accept: ".pdf,application/pdf",
    multiple: false,
    icon: "edit",
  },
  {
    id: "pdf-para-jpg",
    kind: "pdf-to-jpg",
    category: "imagens",
    title: "PDF para JPG",
    description: "Converta cada página do PDF em imagens JPG.",
    href: "/pdf-para-jpg",
    status: "available",
    accent: "#f2b705",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "jpg",
  },
  {
    id: "jpg-para-pdf",
    kind: "jpg-to-pdf",
    category: "imagens",
    title: "JPG para PDF",
    description: "Converta imagens JPG e PNG em PDF individual ou unificado.",
    href: "/jpg-para-pdf",
    status: "available",
    accent: "#f2b705",
    accept: "image/*,.jpg,.jpeg,.png,.webp",
    multiple: true,
    icon: "jpg",
  },
  {
    id: "assinar-pdf",
    kind: "pdf-sign",
    category: "documentos",
    title: "Assinar PDF",
    description: "Aplique uma assinatura em imagem sobre as páginas do PDF.",
    href: "/ferramentas/assinar-pdf",
    status: "available",
    accent: "#3742fa",
    accept: ".pdf,application/pdf",
    multiple: false,
    icon: "sign",
  },
  {
    id: "marca-dagua",
    kind: "pdf-watermark",
    category: "documentos",
    title: "Marca d'água",
    description: "Adicione texto como marca d'água em todas as páginas do PDF.",
    href: "/ferramentas/marca-dagua",
    status: "available",
    accent: "#3742fa",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "watermark",
  },
  {
    id: "rotacionar-pdf",
    kind: "pdf-rotate",
    category: "documentos",
    title: "Rotacionar PDF",
    description: "Gire as páginas do PDF em 90°, 180° ou 270°.",
    href: "/ferramentas/rotacionar-pdf",
    status: "available",
    accent: "#8e44ad",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "rotate",
  },
  {
    id: "html-para-pdf",
    kind: "html-to-pdf",
    category: "documentos",
    title: "HTML para PDF",
    description: "Converta arquivos HTML ou código HTML em documento PDF.",
    href: "/ferramentas/html-para-pdf",
    status: "available",
    accent: "#f39c12",
    accept: ".html,.htm,text/html",
    multiple: true,
    icon: "html",
  },
  {
    id: "desbloquear-pdf",
    kind: "pdf-unlock",
    category: "documentos",
    title: "Desbloquear PDF",
    description: "Remova senha de abertura de PDFs protegidos (com a senha correta).",
    href: "/ferramentas/desbloquear-pdf",
    status: "available",
    accent: "#2c3e50",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "unlock",
  },
  {
    id: "proteger-pdf",
    kind: "pdf-protect",
    category: "documentos",
    title: "Proteger PDF",
    description: "Proteja o PDF com senha de abertura.",
    href: "/ferramentas/proteger-pdf",
    status: "available",
    accent: "#2c3e50",
    accept: ".pdf,application/pdf",
    multiple: true,
    icon: "lock",
  },
  {
    id: "conversor",
    kind: "image-convert",
    category: "imagens",
    title: "Converter Imagens",
    description:
      "Converta imagens entre JPG, PNG, WEBP, HEIC, AVIF, TIFF e outros formatos em lote.",
    href: "/conversor",
    status: "available",
    accent: "#3b4ea0",
    accept: "image/*",
    multiple: true,
    icon: "images",
  },
];

export function getCategoryBySlug(slug: string): CategoryCard | undefined {
  return CATEGORIES.find((c) => c.slug === slug || c.id === slug);
}

export function getToolsByCategory(categoryId: ToolCategoryId): ToolCard[] {
  return TOOLS.filter((t) => t.category === categoryId);
}

export function getToolBySlug(slug: string): ToolCard | undefined {
  return TOOLS.find((t) => t.id === slug || t.href.endsWith(`/${slug}`));
}

export function toolLabelFromPath(pathname: string): string {
  if (pathname.startsWith("/conversor")) return "Conversor de Imagens";
  if (pathname.startsWith("/jpg-para-pdf")) return "JPG para PDF";
  if (pathname.startsWith("/pdf-para-jpg")) return "PDF para JPG";
  if (pathname.startsWith("/editar-pdf")) return "Editar PDF";
  if (pathname.startsWith("/ramais")) return "Ramais";
  const categoryMatch = pathname.match(/\/categoria\/([^/]+)/);
  if (categoryMatch) {
    const category = getCategoryBySlug(categoryMatch[1]);
    if (category) return category.title;
  }
  const match = pathname.match(/\/ferramentas\/([^/]+)/);
  if (match) {
    const tool = getToolBySlug(match[1]);
    if (tool) return tool.title;
  }
  return "Ferramentas digitais";
}
