"use client";

export default function InstitutionalError({ missing = false, retry }: {
  missing?: boolean;
  retry?: () => void;
}) {
  return (
    <section aria-label="Aviso de Documentos" style={{ fontFamily: 'Arial, sans-serif', color: '#172b4d', background: '#f4f6fa', padding: 'clamp(24px, 6vw, 64px)', minHeight: '60vh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 24, background: '#fff', borderRadius: 16 }}>
        <p>Documentos · Serviços públicos</p>
        <h1>{missing ? 'Não encontramos esta página' : 'Não foi possível abrir esta página'}</h1>
        <p>{missing ? 'O endereço pode ter mudado ou o conteúdo não está disponível.' : 'Ocorreu uma falha temporária. Tente novamente em alguns instantes.'}</p>
        {!missing && <p>Se você acabou de enviar um documento, consulte seu histórico antes de repetir o envio.</p>}
        <nav aria-label="Opções de recuperação" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', marginTop: 24 }}>
          {retry && <button type="button" onClick={retry} style={{ padding: 12, cursor: 'pointer' }}>Tentar novamente</button>}
          <a href="/docs/" style={{ color: '#244ba0', textDecoration: 'underline' }}>Início de Documentos</a>
          <a href="/dashboard.html" style={{ color: '#244ba0', textDecoration: 'underline' }}>Acessar serviços</a>
        </nav>
      </div>
    </section>
  );
}
