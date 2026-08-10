// Arquivo: RoundedImage.js (VERSÃO CORRIGIDA E FINAL)

import styles from './RoundedImage.module.css';

function RoundedImage({ src, alt, width }) {
  // A imagem padrão que será usada em caso de erro.
  // Servida diretamente da pasta /public do frontend.
  const FALLBACK_IMAGE = '/sepultura-padrao.jpeg';

  // Esta função é chamada pelo próprio navegador se o `src` falhar.
  const handleError = (e) => {
    // Para evitar um loop infinito se o próprio fallback falhar,
    // só alteramos a imagem se ela ainda não for o fallback.
    if (e.currentTarget.src !== window.location.origin + FALLBACK_IMAGE) {
      e.currentTarget.src = FALLBACK_IMAGE;
    }
  };

  return (
    <img
      className={`${styles.rounded_image} ${styles[width]}`}
      // O `src` inicial é sempre o que foi passado via props.
      // A lógica de decisão já foi feita no componente pai (MeusSepultados).
      src={src}
      alt={alt}
      // Se o `src` falhar ao carregar, o navegador chama `handleError`.
      onError={handleError}
    />
  );
}

export default RoundedImage;
