import React from 'react';

/**
 * Impede que um erro de renderização da busca derrube a aplicação inteira (tela branca).
 */
export default class MemorialSearchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[MemorialSearchErrorBoundary]', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry();
    } else if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            maxWidth: 480,
            margin: '48px auto',
            padding: 24,
            textAlign: 'center',
            fontFamily: 'Rubik, system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', color: '#364ba3', marginBottom: 8 }}>
            Não foi possível exibir a busca
          </h1>
          <p style={{ color: '#64748b', marginBottom: 16 }}>
            Ocorreu um erro inesperado. Você pode tentar novamente sem perder o acesso ao memorial.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              minHeight: 44,
              padding: '0 20px',
              border: 'none',
              borderRadius: 10,
              background: '#ed9756',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
