async function ensureEducationIndexes(mongoose) {
  require('../models/EducationEntity')
  require('../models/EducationUserAssignment')
  require('../models/EducationPost')
  require('../models/EducationDocument')
  require('../models/EducationLegislation')
  require('../models/EducationCalendarEvent')
  require('../models/EducationGallery')
  require('../models/EducationCouncilMember')
  require('../models/EducationDocumentCategory')
  require('../models/EducationLessonAssignment')

  const modelNames = [
    'EducationEntity',
    'EducationUserAssignment',
    'EducationPost',
    'EducationDocument',
    'EducationLegislation',
    'EducationCalendarEvent',
    'EducationGallery',
    'EducationCouncilMember',
    'EducationDocumentCategory',
    'EducationLessonAssignment',
  ]

  for (const name of modelNames) {
    const Model = mongoose.models[name]
    if (Model) {
      await Model.createIndexes()
    }
  }
}

module.exports = { ensureEducationIndexes }
