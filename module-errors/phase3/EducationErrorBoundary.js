import { Component } from 'react'
import { useLocation } from 'react-router-dom'

export function EducationErrorPage({ missing = false, retry }) {
  return (
    <section aria-label="Aviso da Educação" style={{ padding: '32px 20px', maxWidth: 720, margin: '32px auto', fontFamily: 'Arial, sans-serif', color: '#172b4d', background: '#fff' }}>
      <p>Prefeitura de Garça · Educação</p>
      <h1>{missing ? 'Não encontramos esta página' : 'Não foi possível abrir esta página'}</h1>
      <p>{missing ? 'O endereço pode ter mudado ou o conteúdo não está disponível.' : 'Ocorreu uma falha temporária. Tente novamente em alguns instantes.'}</p>
      {!missing && <p>Se você acabou de salvar informações, confira o histórico antes de repetir a operação.</p>}
      <nav aria-label="Opções de recuperação" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', marginTop: 24 }}>
        {retry && <button type="button" onClick={retry}>Tentar novamente</button>}
        <a href="/educacao/">Início da Educação</a>
        <a href="/dashboard.html">Acessar serviços</a>
      </nav>
    </section>
  )
}

export class EducationBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <EducationErrorPage retry={() => this.setState({ failed: false })} />
      : this.props.children
  }
}

export default function EducationErrorBoundary({ children }) {
  const location = useLocation()
  return <EducationBoundary key={location.pathname}>{children}</EducationBoundary>
}
