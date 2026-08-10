const mongoose = require('../db/conn')
const { Schema } = mongoose
const {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_STATUSES,
  CALENDAR_RECURRENCE_FREQUENCIES,
} = require('../helpers/education-constants')
const { combineDateAndTime, syncPrimaryDatesFromSlots } = require('../helpers/calendar-event-fields')

const timeRangeSchema = new Schema(
  {
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
  },
  { _id: false }
)

const dateSlotSchema = new Schema(
  {
    dateOnly: { type: String, default: '' },
    times: { type: [timeRangeSchema], default: [] },
  },
  { _id: false }
)

const scheduleSlotSchema = new Schema(
  {
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    label: { type: String, default: '' },
  },
  { _id: false }
)

const attachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const recurrenceSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: [...CALENDAR_RECURRENCE_FREQUENCIES, null], default: null },
    interval: { type: Number, default: 1, min: 1 },
    endDate: { type: Date, default: null },
    weekdays: { type: [Number], default: [] },
  },
  { _id: false }
)

const educationCalendarEventSchema = new Schema(
  {
    educationEntityId: {
      type: Schema.Types.ObjectId,
      ref: 'EducationEntity',
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null, index: true },
    startDateOnly: { type: String, default: '', index: true },
    startTime: { type: String, default: '00:00' },
    endDateOnly: { type: String, default: '', index: true },
    endTime: { type: String, default: '23:59' },
    type: { type: String, required: true, enum: CALENDAR_EVENT_TYPES, index: true },
    location: { type: String, default: '' },
    responsible: { type: String, default: '' },
    color: { type: String, default: '#3460a4' },
    status: { type: String, enum: CALENDAR_EVENT_STATUSES, default: 'active', index: true },
    recurrence: { type: recurrenceSchema, default: () => ({}) },
    dateSlots: { type: [dateSlotSchema], default: [] },
    scheduleSlots: { type: [scheduleSlotSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    notifyBeforeDays: { type: Number, default: 1, min: 0 },
    isPublic: { type: Boolean, default: true, index: true },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    duplicatedFrom: { type: Schema.Types.ObjectId, ref: 'EducationCalendarEvent', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

educationCalendarEventSchema.index({ educationEntityId: 1, startDate: 1 })
educationCalendarEventSchema.index({ status: 1, startDate: 1 })

educationCalendarEventSchema.pre('save', function syncDateFields(next) {
  if (this.dateSlots?.length) {
    syncPrimaryDatesFromSlots(this)
  } else if (this.startDateOnly && this.startTime) {
    this.startDate = combineDateAndTime(this.startDateOnly, this.startTime) || this.startDate
  }
  if (!this.dateSlots?.length && this.endDateOnly && this.endTime) {
    this.endDate = combineDateAndTime(this.endDateOnly, this.endTime) || this.endDate
  } else if (this.startDate && !this.endDate) {
    this.endDate = this.startDate
  }
  next()
})

const EducationCalendarEvent = mongoose.model('EducationCalendarEvent', educationCalendarEventSchema)

module.exports = EducationCalendarEvent
