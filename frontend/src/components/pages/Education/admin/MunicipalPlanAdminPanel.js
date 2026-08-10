import {
  listAdminMunicipalPlans,
  createMunicipalPlan,
  updateMunicipalPlan,
  deleteMunicipalPlan,
} from '../../../../services/educationService'
import SimplePdfListAdminPanel from './SimplePdfListAdminPanel'

export default function MunicipalPlanAdminPanel({ showMsg }) {
  return (
    <SimplePdfListAdminPanel
      title="Plano Municipal da Educação"
      description="Cada novo PDF entra na lista pública, do mais recente para o mais antigo. Informe apenas o título — a data e a hora são registradas automaticamente."
      emptyLabel="Nenhum documento cadastrado. Use o formulário acima para adicionar o primeiro PDF."
      showMsg={showMsg}
      listItems={listAdminMunicipalPlans}
      createItem={createMunicipalPlan}
      updateItem={updateMunicipalPlan}
      deleteItem={deleteMunicipalPlan}
    />
  )
}
