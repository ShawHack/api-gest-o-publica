import {
  listAdminEarlyChildhoodPolicies,
  createEarlyChildhoodPolicy,
  updateEarlyChildhoodPolicy,
  deleteEarlyChildhoodPolicy,
} from '../../../../services/educationService'
import SimplePdfListAdminPanel from './SimplePdfListAdminPanel'

export default function EarlyChildhoodPolicyAdminPanel({ showMsg }) {
  return (
    <SimplePdfListAdminPanel
      title="Política Municipal de Qualidade e Equidade da Educação Infantil"
      description="Cada novo PDF entra na lista pública, do mais recente para o mais antigo. Informe apenas o título — a data e a hora são registradas automaticamente."
      emptyLabel="Nenhum documento cadastrado. Use o formulário acima para adicionar o primeiro PDF."
      showMsg={showMsg}
      listItems={listAdminEarlyChildhoodPolicies}
      createItem={createEarlyChildhoodPolicy}
      updateItem={updateEarlyChildhoodPolicy}
      deleteItem={deleteEarlyChildhoodPolicy}
    />
  )
}
