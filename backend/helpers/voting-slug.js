function slugifyTitle(title) {
  return String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'pleito'
}

async function buildVotationSlug(Votation, title, excludeId = null) {
  const base = slugifyTitle(title)
  let slug = base
  let n = 0
  while (true) {
    const query = { slug }
    if (excludeId) query._id = { $ne: excludeId }
    const exists = await Votation.findOne(query).select('_id').lean()
    if (!exists) return slug
    n += 1
    slug = `${base}-${n}`
  }
}

function landingPath(slug) {
  return `/votacao/p/${slug}`
}

module.exports = {
  slugifyTitle,
  buildVotationSlug,
  landingPath,
}
