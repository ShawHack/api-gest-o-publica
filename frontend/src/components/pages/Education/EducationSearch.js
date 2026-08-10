import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import styles from './EducationPortal.module.css'

export default function EducationSearch() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/educacao/busca?q=${encodeURIComponent(q)}`)
  }

  return (
    <form className={styles.nav_search} onSubmit={handleSubmit} role="search">
      <Search size={16} className={styles.nav_search_icon} aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar no portal..."
        className={styles.nav_search_input}
        aria-label="Buscar no portal da educação"
      />
    </form>
  )
}
