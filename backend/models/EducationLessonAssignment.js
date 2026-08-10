const mongoose = require('../db/conn')
const { Schema } = mongoose
const {
  LESSON_ASSIGNMENT_PROCESS_STATUSES,
  LESSON_ASSIGNMENT_PUBLICATION_STATUSES,
  LESSON_ASSIGNMENT_CATEGORIES,
  LESSON_TEACHER_TYPES,
  LESSON_VACANCY_STATUSES,
  LESSON_DOCUMENT_TYPES,
} = require('../helpers/education-constants')

const teacherSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    registration: { type: String, default: '', trim: true },
    teacherType: { type: String, required: true, enum: LESSON_TEACHER_TYPES, index: true },
    educationEntityId: { type: Schema.Types.ObjectId, ref: 'EducationEntity', default: null },
    subject: { type: String, default: '', trim: true },
    position: { type: String, default: '', trim: true },
    notes: { type: String, default: '' },
  },
  { _id: true }
)

const vacancySchema = new Schema(
  {
    educationEntityId: { type: Schema.Types.ObjectId, ref: 'EducationEntity', required: true },
    position: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    workload: { type: String, default: '', trim: true },
    period: { type: String, default: '', trim: true },
    classCount: { type: Number, default: 0, min: 0 },
    vacancyStatus: { type: String, default: 'disponivel', enum: LESSON_VACANCY_STATUSES },
  },
  { _id: true }
)

const documentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    documentType: { type: String, default: 'edital', enum: LESSON_DOCUMENT_TYPES },
    fileUrl: { type: String, required: true },
    originalName: { type: String, default: '' },
  },
  { _id: true }
)

const educationLessonAssignmentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'atribuicao_anual', enum: LESSON_ASSIGNMENT_CATEGORIES, index: true },
    processStatus: {
      type: String,
      default: 'aberta',
      enum: LESSON_ASSIGNMENT_PROCESS_STATUSES,
      index: true,
    },
    publicationStatus: {
      type: String,
      default: 'draft',
      enum: LESSON_ASSIGNMENT_PUBLICATION_STATUSES,
      index: true,
    },
    assignmentDate: { type: Date, default: null, index: true },
    assignmentDateOnly: { type: String, default: '', index: true },
    assignmentTime: { type: String, default: '' },
    assignmentEndTime: { type: String, default: '' },
    location: { type: String, default: '' },
    observations: { type: String, default: '' },
    period: { type: String, default: '', trim: true, index: true },
    showEffectiveTeachers: { type: Boolean, default: false },
    teachers: { type: [teacherSchema], default: [] },
    vacancies: { type: [vacancySchema], default: [] },
    documents: { type: [documentSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

educationLessonAssignmentSchema.index({ publicationStatus: 1, assignmentDate: 1 })
educationLessonAssignmentSchema.index({ 'teachers.name': 'text', title: 'text', description: 'text' })

const EducationLessonAssignment = mongoose.model(
  'EducationLessonAssignment',
  educationLessonAssignmentSchema
)

module.exports = EducationLessonAssignment
