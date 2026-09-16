const fs = require('fs');

const legisFieldsHtml = `
          <!-- ================================================================= -->
          <!-- 10. LEGISLAÇÃO / REPOSITÓRIO DOCUMENTAL (LEGISLATION FORM)        -->
          <!-- ================================================================= -->
          <div id="legislationFields" class="comtur-category-fields" style="display:none">

            <!-- SEÇÃO 1: Dados do Documento -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">1</span> Dados do Documento</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="legisTitle">Título do documento <span class="req">*</span></label>
                  <input id="legisTitle" class="comtur-input" placeholder="Ex.: Lei nº 5.432/2026 — Dispõe sobre o Conselho Municipal de Turismo">
                </div>
                <div class="comtur-field">
                  <label for="legisDocType">Tipo de documento <span class="req">*</span></label>
                  <select id="legisDocType" class="comtur-select">
                    <option value="Lei" selected>Lei</option>
                    <option value="Lei Complementar">Lei Complementar</option>
                    <option value="Decreto">Decreto</option>
                    <option value="Portaria">Portaria</option>
                    <option value="Resolução">Resolução</option>
                    <option value="Regimento Interno">Regimento Interno</option>
                    <option value="Deliberação">Deliberação</option>
                    <option value="Instrução Normativa">Instrução Normativa</option>
                    <option value="Ato">Ato</option>
                    <option value="Edital">Edital</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                      <label for="legisNumber">Número</label>
                      <input id="legisNumber" class="comtur-input" placeholder="Ex.: 5432">
                    </div>
                    <div>
                      <label for="legisYear">Ano <span class="req">*</span></label>
                      <input id="legisYear" type="number" min="1900" max="2100" class="comtur-input" placeholder="2026">
                    </div>
                  </div>
                </div>
                <div class="comtur-field">
                  <label for="legisOfficialIdentifier">Número completo / Identificação oficial</label>
                  <input id="legisOfficialIdentifier" class="comtur-input" placeholder="Ex.: Lei nº 5.432/2026">
                </div>
                <div class="comtur-field">
                  <label for="legisResponsibleBody">Órgão responsável</label>
                  <input id="legisResponsibleBody" class="comtur-input" placeholder="Ex.: Prefeitura Municipal, COMTUR, Secretaria de Turismo">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="legisSlug">Identificador na URL (slug) <span class="req">*</span></label>
                  <input id="legisSlug" class="comtur-input" placeholder="lei-5432-2026-conselho-municipal-de-turismo">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="legisSummary">Ementa / Resumo do documento <span class="req">*</span></label>
                  <textarea id="legisSummary" class="comtur-textarea" rows="3" placeholder="Ex.: Dispõe sobre a reestruturação do Conselho Municipal de Turismo (COMTUR), institui o Fundo Municipal de Turismo (FUMTUR) e dá outras providências..."></textarea>
                </div>
              </div>
            </div>

            <!-- SEÇÃO 2: Datas do Documento -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">2</span> Datas do Documento</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="legisDocumentDate">Data do documento <span class="req">*</span></label>
                  <input id="legisDocumentDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="legisPublicationDate">Data de publicação oficial</label>
                  <input id="legisPublicationDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="legisEffectiveFrom">Data de início da vigência</label>
                  <input id="legisEffectiveFrom" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="legisEffectiveUntil">Data de término da vigência (se aplicável)</label>
                  <input id="legisEffectiveUntil" type="date" class="comtur-input">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="legisLegalStatus">Situação jurídica da norma</label>
                  <select id="legisLegalStatus" class="comtur-select">
                    <option value="Vigente" selected>🟢 Vigente</option>
                    <option value="Alterado">🟡 Alterado</option>
                    <option value="Revogado">🔴 Revogado</option>
                    <option value="Suspenso">⚪ Suspenso</option>
                    <option value="Sem informação">Sem informação</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- SEÇÃO 3: Arquivo PDF (ESSENCIAL) -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">3</span> Arquivo PDF do Documento <span class="req">*</span></div>
              <p class="comtur-hint" style="margin-bottom: 14px;">Anexe o arquivo oficial em PDF. O PDF é o documento principal que os cidadãos e conselheiros poderão visualizar e baixar.</p>
              
              <!-- Estado Vazio (Sem PDF) -->
              <div id="legisPdfEmpty" class="comtur-upload-zone" onclick="$('legisPdfFileInput').click()" style="cursor: pointer;">
                <input id="legisPdfFileInput" type="file" accept="application/pdf,.pdf" style="display:none">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">📄</div>
                <div style="font-weight: 700; color: var(--comtur-primary-dark); font-size: 1rem;">Clique para selecionar o arquivo PDF</div>
                <div class="comtur-hint">Formato obrigatório: PDF (.pdf) • Tamanho máximo: 20 MB</div>
              </div>

              <!-- Estado Anexado (Com Preview e Metadados) -->
              <div id="legisPdfPreview" style="display: none; background: #f0fdf4; border: 2px solid var(--comtur-primary-border); border-radius: var(--comtur-radius-lg); padding: 18px;">
                <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap; justify-content: space-between;">
                  <div style="display: flex; gap: 14px; align-items: center; min-width: 260px;">
                    <div style="width: 52px; height: 52px; background: #dc2626; color: #fff; border-radius: var(--comtur-radius-md); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; box-shadow: var(--comtur-shadow-sm);">PDF</div>
                    <div>
                      <div id="legisPdfFileNameDisplay" style="font-weight: 800; color: var(--comtur-primary-dark); font-size: 1rem; word-break: break-all;">nome_do_arquivo.pdf</div>
                      <div style="font-size: 0.82rem; color: var(--comtur-text-muted); margin-top: 2px;">
                        Tamanho: <strong id="legisPdfSizeDisplay">2,4 MB</strong> • Enviado em: <span id="legisPdfDateDisplay">15/08/2026</span>
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <button id="btnViewLegisPdf" type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="if(legisPdfFile&&legisPdfFile.url) window.open(legisPdfFile.url, '_blank')">👁️ Visualizar PDF</button>
                    <button id="btnReplaceLegisPdf" type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="$('legisPdfFileInput').click()">🔄 Substituir</button>
                    <button id="btnRemoveLegisPdf" type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="legisPdfFile = null; renderLegisPdfPreview();">🗑️ Remover</button>
                  </div>
                </div>
                <div class="comtur-field" style="margin-top: 14px; margin-bottom: 0;">
                  <label for="legisPdfTitle">Título do arquivo para download</label>
                  <input id="legisPdfTitle" class="comtur-input" placeholder="Ex.: Lei Municipal nº 5.432/2026 - Texto Integral">
                </div>
              </div>
              <div id="legisPdfProgress" class="comtur-hint" style="margin-top: 8px; font-weight: 600; color: var(--comtur-primary);"></div>
            </div>

            <!-- SEÇÃO 4: Classificação e Assuntos -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">4</span> Classificação e Assuntos</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="legisCategory">Categoria temática</label>
                  <select id="legisCategory" class="comtur-select">
                    <option value="COMTUR" selected>COMTUR</option>
                    <option value="Fundo Municipal de Turismo">Fundo Municipal de Turismo</option>
                    <option value="Turismo">Turismo</option>
                    <option value="Eventos">Eventos</option>
                    <option value="Planejamento">Planejamento</option>
                    <option value="Regionalização">Regionalização</option>
                    <option value="Administração">Administração</option>
                    <option value="Orçamento">Orçamento</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="legisCustomTags">Tags adicionais (separadas por vírgula)</label>
                  <input id="legisCustomTags" class="comtur-input" placeholder="Ex.: eleições, regimento, 2026, governança">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label>Tags temáticas estruturadas</label>
                  <div id="legisTagsChips" class="comtur-chips-grid"></div>
                </div>
              </div>
            </div>

            <!-- SEÇÃO 5: Documentos Relacionados -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">5</span> Documentos Relacionados</div>
              <p class="comtur-hint" style="margin-bottom: 12px;">Relacione normas e atos correlatos (ex.: leis alteradas, revogadas, decretos regulamentadores):</p>
              <div class="comtur-grid-2" style="background: #f8fafc; padding: 14px; border: 1px solid var(--comtur-border-light); border-radius: var(--comtur-radius-md); margin-bottom: 14px;">
                <div class="comtur-field" style="margin-bottom: 0;">
                  <label for="legisRelationTypeSelect">Tipo de relação</label>
                  <select id="legisRelationTypeSelect" class="comtur-select">
                    <option value="Altera">Altera o documento</option>
                    <option value="Alterado por">Alterado por</option>
                    <option value="Revoga">Revoga o documento</option>
                    <option value="Revogado por">Revogado por</option>
                    <option value="Regulamenta">Regulamenta</option>
                    <option value="Regulamentado por">Regulamentado por</option>
                    <option value="Regimento relacionado">Regimento relacionado</option>
                    <option value="Plano relacionado">Plano relacionado</option>
                    <option value="Correlato">Documento correlato</option>
                  </select>
                </div>
                <div class="comtur-field" style="margin-bottom: 0;">
                  <label for="legisRelatedDocSelect">Documento legal</label>
                  <div style="display: flex; gap: 8px;">
                    <select id="legisRelatedDocSelect" class="comtur-select" style="flex: 1;">
                      <option value="">-- Selecionar documento da Legislação --</option>
                    </select>
                    <button id="btnAddRelatedLegisDoc" type="button" class="comtur-btn comtur-btn-primary comtur-btn-sm" onclick="addLegisRelatedDoc()">+ Adicionar</button>
                  </div>
                </div>
              </div>
              <div id="legisRelatedDocsList"></div>
            </div>

            <!-- SEÇÃO 6: Publicação -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">6</span> Publicação</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="legisPublishDate">Data de publicação no portal</label>
                  <input id="legisPublishDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 26px;">
                    <label style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                      <input id="legisShowOnPortal" type="checkbox" checked style="width: 16px; height: 16px; accent-color: var(--comtur-primary);">
                      <span>Exibir no Portal Público de Legislação</span>
                    </label>
                    <label style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                      <input id="legisFeatured" type="checkbox" style="width: 16px; height: 16px; accent-color: var(--comtur-primary);">
                      <span>Documento em destaque no repositório</span>
                    </label>
                  </div>
                </div>
              </div>
              <div class="comtur-actions-bar" style="margin-top: 20px;">
                <div class="comtur-actions-group">
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('draft')">Salvar Rascunho</button>
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('review')">Enviar para Revisão</button>
                  <button type="button" class="comtur-btn comtur-btn-primary" onclick="saveContent('published')">Publicar Documento</button>
                </div>
                <div class="comtur-actions-group">
                  <button id="btnArchiveLegis" type="button" class="comtur-btn comtur-btn-danger" style="display:none;" onclick="saveContent('archived')">📦 Arquivar</button>
                </div>
              </div>
            </div>

          </div>
`;

console.log('Legislation HTML template ready!');
