import NewsCard from './NewsCard'
import styles from './EducationPortal.module.css'

export default function NewsEditorialGrid({ posts }) {
  if (!posts?.length) return null

  const [hero, ...side] = posts

  return (
    <div className={styles.news_editorial}>
      <div className={styles.news_editorial_hero}>
        <NewsCard post={hero} variant="featured" />
      </div>
      {side.length > 0 && (
        <div className={styles.news_editorial_side}>
          {side.map((post) => (
            <NewsCard key={post._id} post={post} variant="compact" />
          ))}
        </div>
      )}
    </div>
  )
}
