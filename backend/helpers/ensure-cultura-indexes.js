async function ensureCulturaIndexes(mongoose) {
  require('../models/CulturaPost')
  require('../models/CulturaCategory')
  require('../models/CulturaUserAssignment')
  require('../models/CulturaSavedEvent')

  const modelNames = [
    'CulturaPost',
    'CulturaCategory',
    'CulturaUserAssignment',
    'CulturaSavedEvent',
  ]

  for (const name of modelNames) {
    const Model = mongoose.models[name]
    if (Model) await Model.createIndexes()
  }
}

module.exports = { ensureCulturaIndexes }
