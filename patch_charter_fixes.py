import os

# 1. Patch apps/api/src/structure/structure.service.ts
api_path = '/home/semit/Documentos/sd_docs/apps/api/src/structure/structure.service.ts'
if os.path.exists(api_path):
    with open(api_path, 'r', encoding='utf-8') as f:
        api_code = f.read()

    target_create = '''  async createServiceCharter(
    actor: AuthenticatedUser,
    dto: CreateServiceCharterDto,
  ) {
    await this.validateServiceCharterSector(actor.organizationId, dto.sectorId);'''

    replacement_create = '''  async createServiceCharter(
    actor: AuthenticatedUser,
    dto: CreateServiceCharterDto,
  ) {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) throw new BadRequestException("Informe o nome do serviço");
    const duplicate = await this.prisma.serviceCharter.findFirst({
      where: {
        organizationId: actor.organizationId,
        name: { equals: trimmedName, mode: "insensitive" },
        status: { not: "DELETED" },
      },
    });
    if (duplicate) {
      throw new ConflictException("Já existe um serviço cadastrado com este nome");
    }
    await this.validateServiceCharterSector(actor.organizationId, dto.sectorId);'''

    target_update = '''  async updateServiceCharter(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateServiceCharterDto,
  ) {
    const current = await this.prisma.serviceCharter.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!current)
      throw new NotFoundException("Carta de Serviço não encontrada");
    if (dto.sectorId) {'''

    replacement_update = '''  async updateServiceCharter(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateServiceCharterDto,
  ) {
    const current = await this.prisma.serviceCharter.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!current)
      throw new NotFoundException("Carta de Serviço não encontrada");
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) throw new BadRequestException("Informe o nome do serviço");
      const duplicate = await this.prisma.serviceCharter.findFirst({
        where: {
          id: { not: id },
          organizationId: actor.organizationId,
          name: { equals: trimmedName, mode: "insensitive" },
          status: { not: "DELETED" },
        },
      });
      if (duplicate) {
        throw new ConflictException("Já existe um serviço cadastrado com este nome");
      }
    }
    if (dto.sectorId) {'''

    if target_create in api_code:
        api_code = api_code.replace(target_create, replacement_create)
        print("Patched createServiceCharter in structure.service.ts")
    else:
        print("Target createServiceCharter not found in structure.service.ts")

    if target_update in api_code:
        api_code = api_code.replace(target_update, replacement_update)
        print("Patched updateServiceCharter in structure.service.ts")
    else:
        print("Target updateServiceCharter not found in structure.service.ts")

    with open(api_path, 'w', encoding='utf-8') as f:
        f.write(api_code)

# 2. Patch apps/web/src/components/structure-account.tsx
web_path = '/home/semit/Documentos/sd_docs/apps/web/src/components/structure-account.tsx'
if os.path.exists(web_path):
    with open(web_path, 'r', encoding='utf-8') as f:
        web_code = f.read()

    # Add filterCharterTree before chartersForCategory
    target_helpers = '''function flattenCharters(
  nodes: Charter[],
  depth = 0,
  collapsedIds: Set<string> = new Set(),
): Array<{ node: Charter; depth: number }> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...(collapsedIds.has(node.id)
      ? []
      : flattenCharters(node.children ?? [], depth + 1, collapsedIds)),
  ]);
}'''

    replacement_helpers = '''function flattenCharters(
  nodes: Charter[],
  depth = 0,
  collapsedIds: Set<string> = new Set(),
): Array<{ node: Charter; depth: number }> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...(collapsedIds.has(node.id)
      ? []
      : flattenCharters(node.children ?? [], depth + 1, collapsedIds)),
  ]);
}

function filterCharterTree(nodes: Charter[], search: string): Charter[] {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  if (!term) return nodes;

  return nodes.flatMap((node) => {
    const children = filterCharterTree(node.children ?? [], term);
    const matches = node.name.toLocaleLowerCase("pt-BR").includes(term);

    return matches || children.length ? [{ ...node, children }] : [];
  });
}'''

    if target_helpers in web_code and "function filterCharterTree" not in web_code:
        web_code = web_code.replace(target_helpers, replacement_helpers)
        print("Added filterCharterTree to structure-account.tsx")

    # In ServiceChartersPage: formError state and validation
    target_page_state = '''export function ServiceChartersPage() {
  const { data: user } = useCurrentUser();
  const canManage =
    user?.permissions.includes("service_charters.manage") ?? false;
  const [formOpen, setFormOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [form, setForm] = useState<CharterFormState>(() =>
    emptyCharterForm(""),
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());'''

    replacement_page_state = '''export function ServiceChartersPage() {
  const { data: user } = useCurrentUser();
  const canManage =
    user?.permissions.includes("service_charters.manage") ?? false;
  const [formOpen, setFormOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<CharterFormState>(() =>
    emptyCharterForm(""),
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());'''

    if target_page_state in web_code:
        web_code = web_code.replace(target_page_state, replacement_page_state)
        print("Added formError state in ServiceChartersPage")

    # In mutation: validation and formError handling
    target_mutation = '''  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        sectorId: form.sectorId,
        taxonomyContextId: form.taxonomyContextId,
        parentId: form.parentId || null,
        icon: form.icon || undefined,
        subjectIds: form.subjectIds,
        attachmentFileNameIds: form.attachmentFileNameIds,
        requiredAttachmentFileNameIds: form.requiredAttachmentFileNameIds,
        formFields: form.customFormEnabled ? form.formFields : [],
        online: form.online,
        featuredTerm: form.online ? form.featuredTerm || undefined : undefined,
        description: form.description,
        officialContent: form.online ? form.officialContent : undefined,
        status: "ACTIVE" as const,
      };
      const entity = editingId
        ? await api<{ id: string }>(
            `/api/backend/structure/service-charters/${editingId}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
          )
        : await api<{ id: string }>("/api/backend/structure/service-charters", {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              parentId: form.parentId || undefined,
            }),
          });
      if (form.online && form.officialIconFile) {
        const upload = new FormData();
        upload.append("file", form.officialIconFile);
        await api(`/api/backend/structure/service-charters/${entity.id}/icon`, {
          method: "POST",
          body: upload,
        });
      }
      return entity;
    },
    onSuccess: () => {
      setFormOpen(false);
      setDuplicating(false);
      setEditingId(null);
      setForm(emptyCharterForm(activeCategoryId));
      client.invalidateQueries({ queryKey: ["service-charters"] });
    },
  });'''

    replacement_mutation = '''  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = form.name.trim();
      if (!trimmedName) {
        throw new ApiError("Informe o nome do serviço.", 400);
      }
      const isDuplicate = allRows.some(
        ({ node }) =>
          node.id !== editingId &&
          node.name.trim().toLocaleLowerCase("pt-BR") ===
            trimmedName.toLocaleLowerCase("pt-BR"),
      );
      if (isDuplicate) {
        throw new ApiError(
          "Já existe um serviço cadastrado com este nome nesta categoria.",
          409,
        );
      }
      const payload = {
        name: trimmedName,
        sectorId: form.sectorId,
        taxonomyContextId: form.taxonomyContextId,
        parentId: form.parentId || null,
        icon: form.icon || undefined,
        subjectIds: form.subjectIds,
        attachmentFileNameIds: form.attachmentFileNameIds,
        requiredAttachmentFileNameIds: form.requiredAttachmentFileNameIds,
        formFields: form.customFormEnabled ? form.formFields : [],
        online: form.online,
        featuredTerm: form.online ? form.featuredTerm || undefined : undefined,
        description: form.description,
        officialContent: form.online ? form.officialContent : undefined,
        status: "ACTIVE" as const,
      };
      const entity = editingId
        ? await api<{ id: string }>(
            `/api/backend/structure/service-charters/${editingId}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
          )
        : await api<{ id: string }>("/api/backend/structure/service-charters", {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              parentId: form.parentId || undefined,
            }),
          });
      if (form.online && form.officialIconFile) {
        const upload = new FormData();
        upload.append("file", form.officialIconFile);
        await api(`/api/backend/structure/service-charters/${entity.id}/icon`, {
          method: "POST",
          body: upload,
        });
      }
      return entity;
    },
    onSuccess: () => {
      setFormOpen(false);
      setDuplicating(false);
      setEditingId(null);
      setFormError("");
      setForm(emptyCharterForm(activeCategoryId));
      client.invalidateQueries({ queryKey: ["service-charters"] });
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar o serviço. Revise os campos e tente novamente.",
      );
    },
  });'''

    if target_mutation in web_code:
        web_code = web_code.replace(target_mutation, replacement_mutation)
        print("Patched mutation in ServiceChartersPage")
    else:
        print("Target mutation not found in ServiceChartersPage")

    # Rows filtering logic
    target_rows = '''  const categoryTree = chartersForCategory(query.data ?? [], activeCategoryId);
  const allRows = flattenCharters(categoryTree);
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const rows = normalizedSearch
    ? allRows.filter(({ node }) =>
        node.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
      )
    : flattenCharters(categoryTree, 0, collapsed);'''

    replacement_rows = '''  const categoryTree = chartersForCategory(query.data ?? [], activeCategoryId);
  const allRows = flattenCharters(categoryTree);
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filteredTree = normalizedSearch
    ? filterCharterTree(categoryTree, normalizedSearch)
    : categoryTree;
  const rows = flattenCharters(filteredTree, 0, collapsed);'''

    if target_rows in web_code:
        web_code = web_code.replace(target_rows, replacement_rows)
        print("Patched rows filtering in ServiceChartersPage")
    else:
        print("Target rows not found in ServiceChartersPage")

    # TreeToggle collapsed check
    target_toggle = '''                    {node.children?.length ? (
                      <TreeToggle
                        label={node.name}
                        collapsed={collapsed.has(node.id) && !normalizedSearch}
                        onToggle={() =>
                          setCollapsed((current) =>
                            toggleCollapsedId(current, node.id),
                          )
                        }
                      />
                    ) : (
                      <span className="tree-toggle-placeholder" />
                    )}'''

    replacement_toggle = '''                    {node.children?.length ? (
                      <TreeToggle
                        label={node.name}
                        collapsed={collapsed.has(node.id)}
                        onToggle={() =>
                          setCollapsed((current) =>
                            toggleCollapsedId(current, node.id),
                          )
                        }
                      />
                    ) : (
                      <span className="tree-toggle-placeholder" />
                    )}'''

    if target_toggle in web_code:
        web_code = web_code.replace(target_toggle, replacement_toggle)
        print("Patched TreeToggle in structure-account.tsx")
    else:
        print("Target TreeToggle not found in structure-account.tsx")

    # Reset formError on open actions
    web_code = web_code.replace(
        '''  const duplicateCharter = (charter: Charter) => {
    setSelectedCategoryId(charter.taxonomyContextId ?? activeCategoryId);''',
        '''  const duplicateCharter = (charter: Charter) => {
    setFormError("");
    setSelectedCategoryId(charter.taxonomyContextId ?? activeCategoryId);'''
    )
    web_code = web_code.replace(
        '''  const editCharter = (charter: Charter) => {
    setSelectedCategoryId(charter.taxonomyContextId ?? activeCategoryId);''',
        '''  const editCharter = (charter: Charter) => {
    setFormError("");
    setSelectedCategoryId(charter.taxonomyContextId ?? activeCategoryId);'''
    )
    web_code = web_code.replace(
        '''              onClick={() => {
                setForm(emptyCharterForm(activeCategoryId));
                setDuplicating(false);
                setEditingId(null);
                setFormOpen(true);
              }}''',
        '''              onClick={() => {
                setFormError("");
                setForm(emptyCharterForm(activeCategoryId));
                setDuplicating(false);
                setEditingId(null);
                setFormOpen(true);
              }}'''
    )

    # Pass formError to ServiceCharterForm
    target_render_form = '''        onCancel={() => {
          setFormOpen(false);
          setDuplicating(false);
          setEditingId(null);
        }}
        onSave={() => mutation.mutate()}
        pending={mutation.isPending}
        error={mutation.isError}
      />'''

    replacement_render_form = '''        onCancel={() => {
          setFormOpen(false);
          setDuplicating(false);
          setEditingId(null);
          setFormError("");
        }}
        onSave={() => mutation.mutate()}
        pending={mutation.isPending}
        error={mutation.isError}
        formError={formError}
      />'''

    if target_render_form in web_code:
        web_code = web_code.replace(target_render_form, replacement_render_form)
        print("Passed formError to ServiceCharterForm")

    # Update ServiceCharterForm signature and error display
    target_form_def = '''export function ServiceCharterForm({
  form,
  duplicate = false,
  editing = false,
  setForm,
  charters,
  categories,
  selectedCategoryId,
  onCategoryChange,
  sectors,
  fileNames,
  onSave,
  onCancel,
  pending,
  error,
}: {
  form: CharterFormState;
  duplicate?: boolean;
  editing?: boolean;
  setForm: React.Dispatch<React.SetStateAction<CharterFormState>>;
  charters: Charter[];
  categories: OfficialCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  sectors: SectorOption[];
  fileNames: AttachmentFileName[];
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  error: boolean;
}) {'''

    replacement_form_def = '''export function ServiceCharterForm({
  form,
  duplicate = false,
  editing = false,
  setForm,
  charters,
  categories,
  selectedCategoryId,
  onCategoryChange,
  sectors,
  fileNames,
  onSave,
  onCancel,
  pending,
  error,
  formError,
}: {
  form: CharterFormState;
  duplicate?: boolean;
  editing?: boolean;
  setForm: React.Dispatch<React.SetStateAction<CharterFormState>>;
  charters: Charter[];
  categories: OfficialCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  sectors: SectorOption[];
  fileNames: AttachmentFileName[];
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  error: boolean;
  formError?: string;
}) {'''

    if target_form_def in web_code:
        web_code = web_code.replace(target_form_def, replacement_form_def)
        print("Updated ServiceCharterForm props definition")

    target_form_error = '''        {error && (
          <p className="sd-form-error" role="alert">
            {editing
              ? "Não foi possível salvar o serviço. Revise os campos e tente novamente."
              : "Não foi possível criar o serviço. Revise os campos e tente novamente."}
          </p>
        )}'''

    replacement_form_error = '''        {(formError || error) && (
          <p className="sd-form-error" role="alert">
            {formError ||
              (editing
                ? "Não foi possível salvar o serviço. Revise os campos e tente novamente."
                : "Não foi possível criar o serviço. Revise os campos e tente novamente.")}
          </p>
        )}'''

    if target_form_error in web_code:
        web_code = web_code.replace(target_form_error, replacement_form_error)
        print("Updated error display in ServiceCharterForm")

    with open(web_path, 'w', encoding='utf-8') as f:
        f.write(web_code)

print("Patch complete!")
