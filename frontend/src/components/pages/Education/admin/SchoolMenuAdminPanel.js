import {
  listAdminSchoolMenus,
  createSchoolMenu,
  updateSchoolMenu,
  deleteSchoolMenu,
} from '../../../../services/educationService'
import SimplePdfListAdminPanel from './SimplePdfListAdminPanel'

export default function SchoolMenuAdminPanel({ showMsg }) {
  return (
    <SimplePdfListAdminPanel
      title="Cardápio Escolar"
      description="Cada novo PDF entra na lista pública, do mais recente para o mais antigo. Informe apenas o título — a data e a hora são registradas automaticamente."
      emptyLabel="Nenhum cardápio cadastrado. Use o formulário acima para adicionar o primeiro PDF."
      showMsg={showMsg}
      listItems={listAdminSchoolMenus}
      createItem={createSchoolMenu}
      updateItem={updateSchoolMenu}
      deleteItem={deleteSchoolMenu}
    />
  )
}
