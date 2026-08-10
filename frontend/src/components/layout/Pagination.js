import styles from './Pagination.module.css'

function Pagination({ currentPage, totalPages, onPageChange, loading = false }) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      // Mostra todas as páginas se houver poucas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Lógica para mostrar páginas com ellipsis
      if (currentPage <= 3) {
        // Início: mostra primeiras páginas
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Fim: mostra últimas páginas
        pages.push(1)
        pages.push('ellipsis')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Meio: mostra páginas ao redor da atual
        pages.push(1)
        pages.push('ellipsis')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pagination_button}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        aria-label="Página anterior"
      >
        ‹ Anterior
      </button>

      <div className={styles.pagination_numbers}>
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return <span key={`ellipsis-${index}`} className={styles.ellipsis}>...</span>
          }
          
          return (
            <button
              key={page}
              className={`${styles.pagination_number} ${currentPage === page ? styles.active : ''}`}
              onClick={() => onPageChange(page)}
              disabled={loading}
              aria-label={`Página ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        })}
      </div>

      <button
        className={styles.pagination_button}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        aria-label="Próxima página"
      >
        Próxima ›
      </button>
    </div>
  )
}

export default Pagination
