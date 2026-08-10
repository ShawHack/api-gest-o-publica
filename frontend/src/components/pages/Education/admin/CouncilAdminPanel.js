import { useEffect, useMemo, useState } from 'react'
import {
  listAdminDocuments,
  createDocument,
  updateDocument,
  publishDocument,
  submitDocumentReview,
  rejectDocumentReview,
  archiveDocument,
  deleteDocument,
  listAdminCouncilMembers,
  createCouncilMember,
  deleteCouncilMember,
  listAssignments,
  createAssignment,
  deleteAssignment,
  listAdminGalleries,
  createGallery,
  updateGallery,
  deleteGallery,
  listAdminCalendar,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listAdminDocumentCategories,
  createDocumentCategory,
  deleteDocumentCategory,
  listAdminLegislation,
  createLegislation,
  updateLegislation,
  deleteLegislation,
  updateCouncilMember,
  updateEntity,
} from '../../../../services/educationService'
import {
  DOCUMENT_TYPE_LABELS,
  MEMBER_ROLE_LABELS,
  MEMBER_SEGMENT_LABELS,
} from '../councilUtils'
import { LEGISLATION_LABELS, DOCUMENT_STATUS_LABELS, formatDateTime, mediaUrl } from '../educationUtils'
import { getUnitImagePath } from './entityUnitFormUtils'
import {
  EMPTY_MEETING_FORM,
  MEETING_STATUS_OPTIONS,
  addMeetingTimeSlot,
  buildMeetingFormData,
  formatMeetingTimesDisplay,
  isMeetingType,
  meetingStatusLabel,
  meetingToForm,
  removeMeetingTimeSlot,
  updateMeetingTimeSlot,
  validateMeetingForm,
} from './meetingAdminUtils'
import styles from './EducationAdminPortal.module.css'

const SUBTABS = [
  { id: 'documents', label: 'Documentos' },
  { id: 'members', label: 'Membros' },
  { id: 'galleries', label: 'Galerias' },
  { id: 'legislation', label: 'Legislação' },
  { id: 'meetings', label: 'Reuniões' },
  { id: 'categories', label: 'Categorias' },
  { id: 'assignments', label: 'Permissões' },
]

const DOC_STATUSES = DOCUMENT_STATUS_LABELS

export default function CouncilAdminPanel({ entities, onReload, showMsg, canManageAssignments = false }) {
  const [subtab, setSubtab] = useState('documents')
  const [councilId, setCouncilId] = useState('')
  const [documents, setDocuments] = useState([])
  const [members, setMembers] = useState([])
  const [galleries, setGalleries] = useState([])
  const [legislation, setLegislation] = useState([])
  const [categories, setCategories] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingDocId, setEditingDocId] = useState(null)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [editingGalleryId, setEditingGalleryId] = useState(null)
  const [editDocFile, setEditDocFile] = useState(null)
  const [editGalleryItems, setEditGalleryItems] = useState([])
  const [editGalleryFiles, setEditGalleryFiles] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [coverFile, setCoverFile] = useState(null)
  const [savingCover, setSavingCover] = useState(false)
  const [docSearch, setDocSearch] = useState('')
  const [docSubmitting, setDocSubmitting] = useState(false)

  const visibleSubtabs = useMemo(
    () => SUBTABS.filter((t) => t.id !== 'assignments' || canManageAssignments),
    [canManageAssignments]
  )

  useEffect(() => {
    if (!visibleSubtabs.some((t) => t.id === subtab)) {
      setSubtab(visibleSubtabs[0]?.id || 'documents')
    }
  }, [visibleSubtabs, subtab])

  const councils = entities.filter((e) => e.type === 'conselho')
  const selectedCouncil = councils.find((c) => c._id === councilId)

  const [docForm, setDocForm] = useState({
    title: '',
    documentType: 'ata',
    description: '',
    meetingType: '',
    meetingDate: '',
    sessionNumber: '',
    referenceYear: String(new Date().getFullYear()),
    calendarEventId: '',
  })
  const [docFile, setDocFile] = useState(null)

  const [memberForm, setMemberForm] = useState({
    name: '',
    role: 'membro_titular',
    segment: 'poder_publico',
    isTitular: true,
  })

  const [assignForm, setAssignForm] = useState({
    userId: '',
    role: 'education_council',
  })

  const [galleryForm, setGalleryForm] = useState({ title: '', description: '', eventDate: '' })
  const [galleryFiles, setGalleryFiles] = useState([])

  const [categoryForm, setCategoryForm] = useState({ slug: '', label: '', documentTypes: 'ata' })

  const [legislationForm, setLegislationForm] = useState({
    title: '', category: 'resolucao', number: '', year: String(new Date().getFullYear()), description: '',
  })
  const [legislationFile, setLegislationFile] = useState(null)
  const [editingLegislationId, setEditingLegislationId] = useState(null)
  const [legislationEditFile, setLegislationEditFile] = useState(null)
  const [legSearch, setLegSearch] = useState('')
  const [legislationSubmitting, setLegislationSubmitting] = useState(false)

  const [meetingForm, setMeetingForm] = useState({ ...EMPTY_MEETING_FORM })
  const [meetingFile, setMeetingFile] = useState(null)
  const [editingMeetingId, setEditingMeetingId] = useState(null)
  const [meetingEditFile, setMeetingEditFile] = useState(null)
  const [meetingSearch, setMeetingSearch] = useState('')
  const [meetingSubmitting, setMeetingSubmitting] = useState(false)

  useEffect(() => {
    setCoverFile(null)
  }, [councilId])

  useEffect(() => {
    if (!councilId) {
      setDocuments([])
      setMembers([])
      setGalleries([])
      setLegislation([])
      setCategories([])
      setAssignments([])
      setCalendarEvents([])
      return
    }
    setLoading(true)
    Promise.all([
      listAdminDocuments({ entityId: councilId, limit: 200 }),
      listAdminCouncilMembers({ entityId: councilId, limit: 50 }),
      listAdminGalleries({ entityId: councilId, limit: 50 }),
      listAdminLegislation({ entityId: councilId, limit: 200 }),
      listAdminDocumentCategories({ entityId: councilId, limit: 50 }),
      listAssignments({ entityId: councilId, limit: 50 }),
      listAdminCalendar({ entityId: councilId, limit: 200 }),
    ])
      .then(([docRes, memRes, galRes, legRes, catRes, asgRes, calRes]) => {
        setDocuments(docRes.data?.data || [])
        setMembers(memRes.data?.data || [])
        setGalleries(galRes.data?.data || [])
        setLegislation(legRes.data?.data || [])
        setCategories(catRes.data?.data || [])
        setAssignments(asgRes.data?.data || [])
        setCalendarEvents(calRes.data?.data || [])
      })
      .catch(() => showMsg('Erro ao carregar dados do conselho.', false))
      .finally(() => setLoading(false))
  }, [councilId, showMsg])

  const filteredDocuments = useMemo(() => {
    const term = docSearch.trim().toLowerCase()
    if (!term) return documents
    return documents.filter((doc) => {
      const haystack = [
        doc.title,
        doc.description,
        doc.sessionNumber,
        DOCUMENT_TYPE_LABELS[doc.documentType],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [documents, docSearch])

  const filteredLegislation = useMemo(() => {
    const term = legSearch.trim().toLowerCase()
    if (!term) return legislation
    return legislation.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.number,
        item.year,
        LEGISLATION_LABELS[item.category],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [legislation, legSearch])

  const councilMeetings = useMemo(
    () => calendarEvents.filter((ev) => isMeetingType(ev.type)),
    [calendarEvents]
  )

  const filteredMeetings = useMemo(() => {
    const term = meetingSearch.trim().toLowerCase()
    if (!term) return councilMeetings
    return councilMeetings.filter((ev) => {
      const haystack = [
        ev.title,
        ev.description,
        ev.location,
        ev.responsible,
        meetingStatusLabel(ev.status, ev.isPublic),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [councilMeetings, meetingSearch])

  async function handleCreateDocument(e, publishNow = false) {
    e.preventDefault()
    if (!councilId || !docFile) {
      showMsg('Selecione o conselho e o arquivo.', false)
      return
    }
    setDocSubmitting(true)
    const fd = new FormData()
    fd.append('educationEntityId', councilId)
    fd.append('title', docForm.title)
    fd.append('documentType', docForm.documentType)
    fd.append('description', docForm.description)
    if (docForm.meetingType) fd.append('meetingType', docForm.meetingType)
    if (docForm.meetingDate) fd.append('meetingDate', docForm.meetingDate)
    if (docForm.sessionNumber) fd.append('sessionNumber', docForm.sessionNumber)
    if (docForm.referenceYear) fd.append('referenceYear', docForm.referenceYear)
    if (docForm.calendarEventId) fd.append('calendarEventId', docForm.calendarEventId)
    if (publishNow) fd.append('publish', 'true')
    fd.append('file', docFile)
    try {
      await createDocument(fd)
      showMsg(publishNow ? 'Documento publicado no portal.' : 'Documento criado como rascunho.')
      setDocForm({
        title: '',
        documentType: 'ata',
        description: '',
        meetingType: '',
        meetingDate: '',
        sessionNumber: '',
        referenceYear: String(new Date().getFullYear()),
        calendarEventId: '',
      })
      setDocFile(null)
      const res = await listAdminDocuments({ entityId: councilId, limit: 200 })
      setDocuments(res.data?.data || [])
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao criar documento.', false)
    } finally {
      setDocSubmitting(false)
    }
  }

  async function handleDocAction(action, id) {
    try {
      if (action === 'edit') {
        const doc = documents.find((d) => d._id === id)
        if (!doc) return
        setEditingDocId(id)
        setDocForm({
          title: doc.title,
          documentType: doc.documentType,
          description: doc.description || '',
          meetingType: doc.meetingType || '',
          meetingDate: doc.meetingDate ? doc.meetingDate.slice(0, 10) : '',
          sessionNumber: doc.sessionNumber || '',
          referenceYear: String(doc.referenceYear || new Date().getFullYear()),
          calendarEventId: doc.calendarEventId?._id || doc.calendarEventId || '',
        })
        setEditDocFile(null)
        return
      }
      if (action === 'publish') await publishDocument(id)
      else if (action === 'submit_review') await submitDocumentReview(id)
      else if (action === 'reject_review') await rejectDocumentReview(id)
      else if (action === 'archive') await archiveDocument(id)
      else if (action === 'delete') {
        if (!window.confirm('Excluir este documento?')) return
        await deleteDocument(id)
      }
      showMsg('Documento atualizado.')
      const res = await listAdminDocuments({ entityId: councilId, limit: 200 })
      setDocuments(res.data?.data || [])
    } catch {
      showMsg('Erro na operação.', false)
    }
  }

  async function handleUpdateDocument(e) {
    e.preventDefault()
    if (!editingDocId) return
    const fd = new FormData()
    fd.append('title', docForm.title)
    fd.append('documentType', docForm.documentType)
    fd.append('description', docForm.description)
    if (docForm.meetingType) fd.append('meetingType', docForm.meetingType)
    if (docForm.meetingDate) fd.append('meetingDate', docForm.meetingDate)
    if (docForm.sessionNumber) fd.append('sessionNumber', docForm.sessionNumber)
    if (docForm.referenceYear) fd.append('referenceYear', docForm.referenceYear)
    if (docForm.calendarEventId) fd.append('calendarEventId', docForm.calendarEventId)
    else fd.append('calendarEventId', '')
    if (editDocFile) fd.append('file', editDocFile)
    try {
      await updateDocument(editingDocId, fd)
      showMsg(editDocFile ? 'Documento atualizado (nova versão).' : 'Documento atualizado.')
      setEditingDocId(null)
      setEditDocFile(null)
      const res = await listAdminDocuments({ entityId: councilId, limit: 200 })
      setDocuments(res.data?.data || [])
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao atualizar.', false)
    }
  }

  async function handleCreateGallery(e) {
    e.preventDefault()
    if (!councilId || !galleryFiles.length) {
      showMsg('Selecione imagens para a galeria.', false)
      return
    }
    const fd = new FormData()
    fd.append('educationEntityId', councilId)
    fd.append('title', galleryForm.title)
    fd.append('description', galleryForm.description)
    if (galleryForm.eventDate) fd.append('eventDate', galleryForm.eventDate)
    galleryFiles.forEach((file) => fd.append('images', file))
    try {
      await createGallery(fd)
      showMsg('Galeria criada.')
      setGalleryForm({ title: '', description: '', eventDate: '' })
      setGalleryFiles([])
      const res = await listAdminGalleries({ entityId: councilId, limit: 50 })
      setGalleries(res.data?.data || [])
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao criar galeria.', false)
    }
  }

  async function handleDeleteGallery(id) {
    if (!window.confirm('Excluir esta galeria?')) return
    try {
      await deleteGallery(id)
      showMsg('Galeria removida.')
      if (editingGalleryId === id) {
        setEditingGalleryId(null)
        setEditGalleryItems([])
        setEditGalleryFiles([])
      }
      const res = await listAdminGalleries({ entityId: councilId, limit: 50 })
      setGalleries(res.data?.data || [])
    } catch {
      showMsg('Erro ao remover galeria.', false)
    }
  }

  function startEditGallery(gallery) {
    setEditingGalleryId(gallery._id)
    setGalleryForm({
      title: gallery.title || '',
      description: gallery.description || '',
      eventDate: gallery.eventDate ? gallery.eventDate.slice(0, 10) : '',
    })
    setEditGalleryItems((gallery.items || []).map((item, index) => ({
      ...item,
      order: item.order ?? index,
    })))
    setEditGalleryFiles([])
  }

  function removeGalleryItem(index) {
    setEditGalleryItems((items) => items.filter((_, i) => i !== index))
  }

  function updateGalleryCaption(index, caption) {
    setEditGalleryItems((items) => items.map((item, i) => (
      i === index ? { ...item, caption } : item
    )))
  }

  async function handleUpdateGallery(e) {
    e.preventDefault()
    if (!editingGalleryId) return
    const fd = new FormData()
    fd.append('title', galleryForm.title)
    fd.append('description', galleryForm.description)
    if (galleryForm.eventDate) fd.append('eventDate', galleryForm.eventDate)
    else fd.append('eventDate', '')
    fd.append('items', JSON.stringify(editGalleryItems.map((item, index) => ({
      mediaUrl: item.mediaUrl,
      mediaType: item.mediaType || 'image',
      caption: item.caption || '',
      order: index,
    }))))
    editGalleryFiles.forEach((file) => fd.append('images', file))
    try {
      await updateGallery(editingGalleryId, fd)
      showMsg('Galeria atualizada.')
      setEditingGalleryId(null)
      setEditGalleryItems([])
      setEditGalleryFiles([])
      setGalleryForm({ title: '', description: '', eventDate: '' })
      const res = await listAdminGalleries({ entityId: councilId, limit: 50 })
      setGalleries(res.data?.data || [])
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao atualizar galeria.', false)
    }
  }

  async function handleCreateCategory(e) {
    e.preventDefault()
    if (!councilId) return
    try {
      await createDocumentCategory({
        educationEntityId: councilId,
        slug: categoryForm.slug,
        label: categoryForm.label,
        documentTypes: categoryForm.documentTypes.split(',').map((s) => s.trim()).filter(Boolean),
      })
      showMsg('Categoria criada.')
      setCategoryForm({ slug: '', label: '', documentTypes: 'ata' })
      const res = await listAdminDocumentCategories({ entityId: councilId, limit: 50 })
      setCategories(res.data?.data || [])
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao criar categoria.', false)
    }
  }

  async function handleDeleteCategory(id) {
    if (!window.confirm('Remover esta categoria?')) return
    try {
      await deleteDocumentCategory(id)
      showMsg('Categoria removida.')
      const res = await listAdminDocumentCategories({ entityId: councilId, limit: 50 })
      setCategories(res.data?.data || [])
    } catch {
      showMsg('Erro ao remover categoria.', false)
    }
  }

  async function handleCreateMember(e) {
    e.preventDefault()
    if (!councilId) return
    try {
      if (editingMemberId) {
        await updateCouncilMember(editingMemberId, { ...memberForm, educationEntityId: councilId })
        showMsg('Membro atualizado.')
        setEditingMemberId(null)
      } else {
        await createCouncilMember({ ...memberForm, educationEntityId: councilId })
        showMsg('Membro adicionado.')
      }
      setMemberForm({ name: '', role: 'membro_titular', segment: 'poder_publico', isTitular: true })
      const res = await listAdminCouncilMembers({ entityId: councilId, limit: 50 })
      setMembers(res.data?.data || [])
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao salvar membro.', false)
    }
  }

  function startEditMember(member) {
    setEditingMemberId(member._id)
    setMemberForm({
      name: member.name,
      role: member.role,
      segment: member.segment,
      isTitular: member.isTitular !== false,
    })
  }

  async function handleCreateLegislation(e) {
    e.preventDefault()
    if (!councilId || !legislationFile) {
      showMsg('Selecione o conselho e o arquivo.', false)
      return
    }
    setLegislationSubmitting(true)
    const fd = new FormData()
    fd.append('educationEntityId', councilId)
    fd.append('title', legislationForm.title)
    fd.append('category', legislationForm.category)
    fd.append('description', legislationForm.description)
    if (legislationForm.number) fd.append('number', legislationForm.number)
    if (legislationForm.year) fd.append('year', legislationForm.year)
    fd.append('status', 'published')
    fd.append('file', legislationFile)
    try {
      await createLegislation(fd)
      showMsg('Legislação publicada.')
      setLegislationForm({
        title: '', category: 'resolucao', number: '', year: String(new Date().getFullYear()), description: '',
      })
      setLegislationFile(null)
      const res = await listAdminLegislation({ entityId: councilId, limit: 200 })
      setLegislation(res.data?.data || [])
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao publicar legislação.', false)
    } finally {
      setLegislationSubmitting(false)
    }
  }

  function handleEditLegislation(item) {
    setEditingLegislationId(item._id)
    setLegislationForm({
      title: item.title,
      category: item.category,
      number: item.number || '',
      year: String(item.year || new Date().getFullYear()),
      description: item.description || '',
    })
    setLegislationEditFile(null)
  }

  async function handleUpdateLegislation(e) {
    e.preventDefault()
    if (!editingLegislationId) return
    setLegislationSubmitting(true)
    const fd = new FormData()
    fd.append('title', legislationForm.title)
    fd.append('category', legislationForm.category)
    fd.append('description', legislationForm.description)
    if (legislationForm.number) fd.append('number', legislationForm.number)
    if (legislationForm.year) fd.append('year', legislationForm.year)
    fd.append('status', 'published')
    if (legislationEditFile) fd.append('file', legislationEditFile)
    try {
      await updateLegislation(editingLegislationId, fd)
      showMsg('Legislação atualizada.')
      setEditingLegislationId(null)
      setLegislationEditFile(null)
      setLegislationForm({
        title: '', category: 'resolucao', number: '', year: String(new Date().getFullYear()), description: '',
      })
      const res = await listAdminLegislation({ entityId: councilId, limit: 200 })
      setLegislation(res.data?.data || [])
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao atualizar legislação.', false)
    } finally {
      setLegislationSubmitting(false)
    }
  }

  async function handlePublishLegislation(id) {
    try {
      const fd = new FormData()
      fd.append('status', 'published')
      await updateLegislation(id, fd)
      showMsg('Legislação publicada no portal.')
      const res = await listAdminLegislation({ entityId: councilId, limit: 200 })
      setLegislation(res.data?.data || [])
    } catch {
      showMsg('Erro ao publicar.', false)
    }
  }

  async function handleDeleteLegislation(id) {
    if (!window.confirm('Remover esta legislação?')) return
    try {
      await deleteLegislation(id)
      showMsg('Legislação removida.')
      const res = await listAdminLegislation({ entityId: councilId, limit: 200 })
      setLegislation(res.data?.data || [])
    } catch {
      showMsg('Erro ao remover.', false)
    }
  }

  async function reloadCouncilCalendar() {
    const res = await listAdminCalendar({ entityId: councilId, limit: 200 })
    setCalendarEvents(res.data?.data || [])
  }

  async function handleCreateMeeting(e, publishNow = true) {
    e.preventDefault()
    if (!councilId) {
      showMsg('Selecione o conselho.', false)
      return
    }
    const error = validateMeetingForm(meetingForm)
    if (error) {
      showMsg(error, false)
      return
    }
    setMeetingSubmitting(true)
    try {
      const fd = buildMeetingFormData(meetingForm, councilId, { publish: publishNow, file: meetingFile })
      await createCalendarEvent(fd)
      showMsg(publishNow ? 'Reunião publicada no calendário.' : 'Reunião salva como rascunho.')
      setMeetingForm({ ...EMPTY_MEETING_FORM })
      setMeetingFile(null)
      await reloadCouncilCalendar()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao cadastrar reunião.', false)
    } finally {
      setMeetingSubmitting(false)
    }
  }

  function handleEditMeeting(meeting) {
    setEditingMeetingId(meeting._id)
    setMeetingForm(meetingToForm(meeting))
    setMeetingEditFile(null)
  }

  async function handleUpdateMeeting(e, publishNow = true) {
    e.preventDefault()
    if (!editingMeetingId) return
    const error = validateMeetingForm(meetingForm)
    if (error) {
      showMsg(error, false)
      return
    }
    setMeetingSubmitting(true)
    try {
      const fd = buildMeetingFormData(meetingForm, councilId, { publish: publishNow, file: meetingEditFile })
      await updateCalendarEvent(editingMeetingId, fd)
      showMsg('Reunião atualizada.')
      setEditingMeetingId(null)
      setMeetingEditFile(null)
      setMeetingForm({ ...EMPTY_MEETING_FORM })
      await reloadCouncilCalendar()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao atualizar reunião.', false)
    } finally {
      setMeetingSubmitting(false)
    }
  }

  async function handlePublishMeeting(id) {
    try {
      const fd = new FormData()
      fd.append('status', 'active')
      fd.append('isPublic', 'true')
      await updateCalendarEvent(id, fd)
      showMsg('Reunião publicada no calendário.')
      await reloadCouncilCalendar()
    } catch {
      showMsg('Erro ao publicar.', false)
    }
  }

  async function handleDeleteMeeting(id) {
    if (!window.confirm('Remover esta reunião?')) return
    try {
      await deleteCalendarEvent(id)
      showMsg('Reunião removida.')
      if (editingMeetingId === id) setEditingMeetingId(null)
      await reloadCouncilCalendar()
    } catch {
      showMsg('Erro ao remover reunião.', false)
    }
  }

  async function handleDeleteMember(id) {
    if (!window.confirm('Remover este membro?')) return
    try {
      await deleteCouncilMember(id)
      showMsg('Membro removido.')
      const res = await listAdminCouncilMembers({ entityId: councilId, limit: 50 })
      setMembers(res.data?.data || [])
    } catch {
      showMsg('Erro ao remover membro.', false)
    }
  }

  async function handleCreateAssignment(e) {
    e.preventDefault()
    if (!councilId || !assignForm.userId) return
    try {
      await createAssignment({
        userId: assignForm.userId,
        educationEntityId: councilId,
        role: assignForm.role,
      })
      showMsg('Permissão vinculada.')
      setAssignForm({ userId: '', role: 'education_council' })
      const res = await listAssignments({ entityId: councilId, limit: 50 })
      setAssignments(res.data?.data || [])
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao vincular usuário.', false)
    }
  }

  async function handleDeleteAssignment(id) {
    if (!window.confirm('Remover este vínculo?')) return
    try {
      await deleteAssignment(id)
      showMsg('Vínculo removido.')
      const res = await listAssignments({ entityId: councilId, limit: 50 })
      setAssignments(res.data?.data || [])
    } catch {
      showMsg('Erro ao remover vínculo.', false)
    }
  }

  async function handleSaveCover(e) {
    e.preventDefault()
    if (!councilId || !coverFile) {
      showMsg('Selecione uma imagem de capa.', false)
      return
    }
    setSavingCover(true)
    try {
      const fd = new FormData()
      fd.append('cover', coverFile)
      await updateEntity(councilId, fd)
      showMsg('Imagem de capa atualizada.')
      setCoverFile(null)
      onReload()
    } catch {
      showMsg('Erro ao enviar imagem de capa.', false)
    } finally {
      setSavingCover(false)
    }
  }

  const councilCoverPath = getUnitImagePath(selectedCouncil)

  return (
    <div className={styles.panel}>
      <h3 style={{ marginTop: 0 }}>Gestão dos Conselhos</h3>
      <label className={styles.field}>
        Conselho
        <select value={councilId} onChange={(e) => setCouncilId(e.target.value)}>
          <option value="">Selecione um conselho...</option>
          {councils.map((c) => (
            <option key={c._id} value={c._id}>
              {c.councilCode ? `${c.councilCode} — ` : ''}{c.name}
            </option>
          ))}
        </select>
      </label>

      {!councilId ? (
        <p className={styles.muted}>Selecione um conselho para gerenciar documentos, membros e permissões.</p>
      ) : (
        <>
          <form onSubmit={handleSaveCover} className={styles.formSection} style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ marginTop: 0 }}>Imagem de capa do conselho</h4>
            <p className={styles.muted}>
              Exibida na listagem pública de conselhos e no portal do conselho selecionado.
            </p>
            <div className={styles.formRow}>
              <label className={`${styles.field} ${styles.formRowFull}`}>
                Foto de capa
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                />
                <span className={styles.fieldHint}>JPG, PNG ou WebP — recomendado 1200×630 px</span>
              </label>
              {councilCoverPath && (
                <div className={styles.formRowFull}>
                  <img
                    src={mediaUrl(councilCoverPath)}
                    alt="Capa atual do conselho"
                    className={styles.previewThumb}
                  />
                </div>
              )}
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.btnPrimary} disabled={!coverFile || savingCover}>
                {savingCover ? 'Salvando...' : 'Salvar capa'}
              </button>
            </div>
          </form>

          <div className={styles.tabs}>
            {visibleSubtabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.tab} ${subtab === t.id ? styles.tabActive : ''}`}
                onClick={() => setSubtab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading && <p className={styles.muted}>Carregando...</p>}

          {subtab === 'documents' && !loading && (
            <>
              <form onSubmit={(e) => handleCreateDocument(e, false)}>
                <h4>Novo documento</h4>
                <p className={styles.muted}>
                  Documentos só aparecem no portal público após serem publicados. Use &quot;Salvar e publicar&quot; para disponibilizar imediatamente aos cidadãos.
                </p>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    Título
                    <input
                      required
                      value={docForm.title}
                      onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Tipo
                    <select
                      value={docForm.documentType}
                      onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}
                    >
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <label className={`${styles.field} ${styles.formRowFull}`}>
                    Descrição
                    <textarea
                      rows={2}
                      value={docForm.description}
                      onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Tipo de reunião
                    <select
                      value={docForm.meetingType}
                      onChange={(e) => setDocForm({ ...docForm, meetingType: e.target.value })}
                    >
                      <option value="">—</option>
                      <option value="ordinaria">Ordinária</option>
                      <option value="extraordinaria">Extraordinária</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    Data da reunião
                    <input
                      type="date"
                      value={docForm.meetingDate}
                      onChange={(e) => setDocForm({ ...docForm, meetingDate: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Nº da sessão
                    <input
                      value={docForm.sessionNumber}
                      onChange={(e) => setDocForm({ ...docForm, sessionNumber: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Ano de referência
                    <input
                      type="number"
                      value={docForm.referenceYear}
                      onChange={(e) => setDocForm({ ...docForm, referenceYear: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Reunião no calendário
                    <select
                      value={docForm.calendarEventId}
                      onChange={(e) => setDocForm({ ...docForm, calendarEventId: e.target.value })}
                    >
                      <option value="">— Nenhuma —</option>
                      {calendarEvents.map((ev) => (
                        <option key={ev._id} value={ev._id}>
                          {ev.title} ({formatDateTime(ev.startDate)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Arquivo (PDF/imagem)
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={docSubmitting}>
                    {docSubmitting ? 'Salvando...' : 'Salvar rascunho'}
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={docSubmitting}
                    onClick={(e) => handleCreateDocument(e, true)}
                  >
                    {docSubmitting ? 'Publicando...' : 'Salvar e publicar'}
                  </button>
                </div>
              </form>

              <h4>Documentos do conselho ({filteredDocuments.length}{docSearch.trim() ? ` de ${documents.length}` : ''})</h4>
              <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
                <label className={`${styles.field} ${styles.formRowFull}`}>
                  Buscar documento
                  <input
                    type="search"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Filtrar por título, descrição ou sessão..."
                  />
                </label>
              </div>

              {editingDocId && (
                <form onSubmit={handleUpdateDocument} style={{ marginBottom: '1rem', padding: '1rem', background: '#f4f7fb', borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0 }}>Editar documento</h4>
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      Título
                      <input required value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      Reunião no calendário
                      <select
                        value={docForm.calendarEventId}
                        onChange={(e) => setDocForm({ ...docForm, calendarEventId: e.target.value })}
                      >
                        <option value="">— Nenhuma —</option>
                        {calendarEvents.map((ev) => (
                          <option key={ev._id} value={ev._id}>
                            {ev.title} ({formatDateTime(ev.startDate)})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      Novo arquivo (opcional — gera nova versão)
                      <input type="file" accept=".pdf,image/*" onChange={(e) => setEditDocFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <div className={styles.formActions}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar</button>
                    <button type="button" className={styles.btn} onClick={() => setEditingDocId(null)}>Cancelar</button>
                  </div>
                </form>
              )}

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Versão</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.muted} style={{ textAlign: 'center', padding: '1rem' }}>
                          {documents.length === 0
                            ? 'Nenhum documento cadastrado para este conselho.'
                            : 'Nenhum documento corresponde à busca.'}
                        </td>
                      </tr>
                    ) : filteredDocuments.map((doc) => (
                      <tr key={doc._id}>
                        <td>
                          <a href={mediaUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer">
                            {doc.title}
                          </a>
                        </td>
                        <td>{DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}</td>
                        <td>v{doc.version || 1}</td>
                        <td>{DOC_STATUSES[doc.status] || doc.status}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.btn} onClick={() => handleDocAction('edit', doc._id)}>
                              Editar
                            </button>
                            {doc.status === 'draft' && (
                              <button type="button" className={styles.btn} onClick={() => handleDocAction('submit_review', doc._id)}>
                                Enviar revisão
                              </button>
                            )}
                            {doc.status === 'pending_review' && (
                              <>
                                <button type="button" className={styles.btn} onClick={() => handleDocAction('publish', doc._id)}>
                                  Aprovar
                                </button>
                                <button type="button" className={styles.btn} onClick={() => handleDocAction('reject_review', doc._id)}>
                                  Devolver
                                </button>
                              </>
                            )}
                            {doc.status !== 'published' && doc.status !== 'pending_review' && (
                              <button type="button" className={styles.btn} onClick={() => handleDocAction('publish', doc._id)}>
                                Publicar
                              </button>
                            )}
                            {doc.status === 'published' && (
                              <button type="button" className={styles.btn} onClick={() => handleDocAction('archive', doc._id)}>
                                Arquivar
                              </button>
                            )}
                            <button type="button" className={styles.btn} onClick={() => handleDocAction('delete', doc._id)}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subtab === 'members' && !loading && (
            <>
              <form onSubmit={handleCreateMember}>
                <h4>{editingMemberId ? 'Editar membro' : 'Novo membro'}</h4>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    Nome
                    <input required value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    Função
                    <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                      {Object.entries(MEMBER_ROLE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Segmento
                    <select value={memberForm.segment} onChange={(e) => setMemberForm({ ...memberForm, segment: e.target.value })}>
                      {Object.entries(MEMBER_SEGMENT_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                    {editingMemberId ? 'Salvar' : 'Adicionar'}
                  </button>
                  {editingMemberId && (
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => {
                        setEditingMemberId(null)
                        setMemberForm({ name: '', role: 'membro_titular', segment: 'poder_publico', isTitular: true })
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
              <h4>Composição</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Nome</th><th>Função</th><th>Segmento</th><th /></tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m._id}>
                        <td>{m.name}</td>
                        <td>{MEMBER_ROLE_LABELS[m.role] || m.role}</td>
                        <td>{MEMBER_SEGMENT_LABELS[m.segment] || m.segment}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.btn} onClick={() => startEditMember(m)}>
                              Editar
                            </button>
                            <button type="button" className={styles.btn} onClick={() => handleDeleteMember(m._id)}>
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subtab === 'galleries' && !loading && (
            <>
              <form onSubmit={editingGalleryId ? handleUpdateGallery : handleCreateGallery}>
                <h4>{editingGalleryId ? 'Editar galeria' : 'Nova galeria'}</h4>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    Título
                    <input required value={galleryForm.title} onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    Data do evento
                    <input type="date" value={galleryForm.eventDate} onChange={(e) => setGalleryForm({ ...galleryForm, eventDate: e.target.value })} />
                  </label>
                  <label className={`${styles.field} ${styles.formRowFull}`}>
                    Descrição
                    <textarea rows={2} value={galleryForm.description} onChange={(e) => setGalleryForm({ ...galleryForm, description: e.target.value })} />
                  </label>
                  {editingGalleryId ? (
                    <>
                      {editGalleryItems.length > 0 && (
                        <div className={`${styles.field} ${styles.formRowFull}`}>
                          <span>Imagens atuais</span>
                          <div className={styles.gallery_thumbs}>
                            {editGalleryItems.map((item, index) => (
                              <div key={item._id || `${item.mediaUrl}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <img src={mediaUrl(item.mediaUrl)} alt="" className={styles.gallery_thumb} style={{ width: 72, height: 72 }} />
                                <input
                                  type="text"
                                  placeholder="Legenda"
                                  value={item.caption || ''}
                                  onChange={(e) => updateGalleryCaption(index, e.target.value)}
                                />
                                <button type="button" className={styles.btn} onClick={() => removeGalleryItem(index)}>Remover</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <label className={`${styles.field} ${styles.formRowFull}`}>
                        Adicionar imagens
                        <input type="file" accept="image/*" multiple onChange={(e) => setEditGalleryFiles(Array.from(e.target.files || []))} />
                      </label>
                    </>
                  ) : (
                    <label className={`${styles.field} ${styles.formRowFull}`}>
                      Imagens
                      <input type="file" accept="image/*" multiple required onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))} />
                    </label>
                  )}
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                    {editingGalleryId ? 'Salvar alterações' : 'Criar galeria'}
                  </button>
                  {editingGalleryId && (
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => {
                        setEditingGalleryId(null)
                        setEditGalleryItems([])
                        setEditGalleryFiles([])
                        setGalleryForm({ title: '', description: '', eventDate: '' })
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
              <h4>Galerias</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Título</th><th>Imagens</th><th /></tr>
                  </thead>
                  <tbody>
                    {galleries.map((g) => (
                      <tr key={g._id}>
                        <td>{g.title}</td>
                        <td>{g.items?.length || 0}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <a
                              href={`/educacao/conselhos/${councils.find((c) => c._id === councilId)?.slug || ''}/galerias/${g._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.btn}
                            >
                              Ver
                            </a>
                            <button type="button" className={styles.btn} onClick={() => startEditGallery(g)}>Editar</button>
                            <button type="button" className={styles.btn} onClick={() => handleDeleteGallery(g._id)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subtab === 'legislation' && !loading && (
            <>
              <form onSubmit={handleCreateLegislation}>
                <h4>Nova legislação do conselho</h4>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    Título
                    <input required value={legislationForm.title} onChange={(e) => setLegislationForm({ ...legislationForm, title: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    Categoria
                    <select value={legislationForm.category} onChange={(e) => setLegislationForm({ ...legislationForm, category: e.target.value })}>
                      {Object.entries(LEGISLATION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Número
                    <input value={legislationForm.number} onChange={(e) => setLegislationForm({ ...legislationForm, number: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    Ano
                    <input type="number" value={legislationForm.year} onChange={(e) => setLegislationForm({ ...legislationForm, year: e.target.value })} />
                  </label>
                  <label className={`${styles.field} ${styles.formRowFull}`}>
                    Descrição
                    <textarea rows={2} value={legislationForm.description} onChange={(e) => setLegislationForm({ ...legislationForm, description: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    Arquivo PDF
                    <input type="file" accept=".pdf,image/*" required onChange={(e) => setLegislationFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={legislationSubmitting}>
                  {legislationSubmitting ? 'Publicando...' : 'Publicar'}
                </button>
              </form>

              {editingLegislationId && (
                <form onSubmit={handleUpdateLegislation} style={{ marginBottom: '1rem', padding: '1rem', background: '#f4f7fb', borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0 }}>Editar legislação</h4>
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      Título
                      <input required value={legislationForm.title} onChange={(e) => setLegislationForm({ ...legislationForm, title: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      Categoria
                      <select value={legislationForm.category} onChange={(e) => setLegislationForm({ ...legislationForm, category: e.target.value })}>
                        {Object.entries(LEGISLATION_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      Número
                      <input value={legislationForm.number} onChange={(e) => setLegislationForm({ ...legislationForm, number: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      Ano
                      <input type="number" value={legislationForm.year} onChange={(e) => setLegislationForm({ ...legislationForm, year: e.target.value })} />
                    </label>
                    <label className={`${styles.field} ${styles.formRowFull}`}>
                      Descrição
                      <textarea rows={2} value={legislationForm.description} onChange={(e) => setLegislationForm({ ...legislationForm, description: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      Novo arquivo (opcional)
                      <input type="file" accept=".pdf,image/*" onChange={(e) => setLegislationEditFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <div className={styles.formActions}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={legislationSubmitting}>
                      {legislationSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button type="button" className={styles.btn} onClick={() => setEditingLegislationId(null)}>Cancelar</button>
                  </div>
                </form>
              )}

              <h4>Legislação vinculada ({filteredLegislation.length}{legSearch.trim() ? ` de ${legislation.length}` : ''})</h4>
              <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
                <label className={`${styles.field} ${styles.formRowFull}`}>
                  Buscar legislação
                  <input
                    type="search"
                    value={legSearch}
                    onChange={(e) => setLegSearch(e.target.value)}
                    placeholder="Filtrar por título, número ou categoria..."
                  />
                </label>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Título</th><th>Categoria</th><th>Nº/Ano</th><th>Status</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {filteredLegislation.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.muted} style={{ textAlign: 'center', padding: '1rem' }}>
                          {legislation.length === 0
                            ? 'Nenhuma legislação cadastrada para este conselho.'
                            : 'Nenhum registro corresponde à busca.'}
                        </td>
                      </tr>
                    ) : filteredLegislation.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <a href={mediaUrl(item.fileUrl)} target="_blank" rel="noopener noreferrer">{item.title}</a>
                        </td>
                        <td>{LEGISLATION_LABELS[item.category] || item.category}</td>
                        <td>{item.number}{item.year ? `/${item.year}` : ''}</td>
                        <td>{DOC_STATUSES[item.status] || item.status || 'Publicado'}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.btn} onClick={() => handleEditLegislation(item)}>Editar</button>
                            {item.status !== 'published' && (
                              <button type="button" className={styles.btn} onClick={() => handlePublishLegislation(item._id)}>Publicar</button>
                            )}
                            <button type="button" className={styles.btn} onClick={() => handleDeleteLegislation(item._id)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subtab === 'meetings' && !loading && (
            <>
              <form onSubmit={(e) => handleCreateMeeting(e, true)}>
                <h4>Nova reunião do conselho</h4>
                <p className={styles.muted}>
                  Reuniões publicadas aparecem no calendário educacional e na página do conselho.
                </p>
                <div className={styles.formRow}>
                  <label className={`${styles.field} ${styles.formRowFull}`}>
                    Título da reunião
                    <input
                      required
                      value={meetingForm.title}
                      onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Data da reunião
                    <input
                      type="date"
                      required
                      value={meetingForm.startDateOnly}
                      onChange={(e) => setMeetingForm({ ...meetingForm, startDateOnly: e.target.value })}
                    />
                  </label>
                  <div className={`${styles.field} ${styles.formRowFull}`}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Horários</span>
                    {meetingForm.times.map((slot, timeIndex) => (
                      <div key={`meeting-time-${timeIndex}`} className={styles.formRow} style={{ marginTop: '0.5rem', alignItems: 'end' }}>
                        <label className={styles.field}>
                          Início
                          <input
                            type="time"
                            required
                            value={slot.startTime}
                            onChange={(e) => setMeetingForm(updateMeetingTimeSlot(meetingForm, timeIndex, 'startTime', e.target.value))}
                          />
                        </label>
                        <label className={styles.field}>
                          Término
                          <input
                            type="time"
                            required
                            value={slot.endTime}
                            onChange={(e) => setMeetingForm(updateMeetingTimeSlot(meetingForm, timeIndex, 'endTime', e.target.value))}
                          />
                        </label>
                        {meetingForm.times.length > 1 && (
                          <button
                            type="button"
                            className={styles.btn}
                            onClick={() => setMeetingForm(removeMeetingTimeSlot(meetingForm, timeIndex))}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.btn}
                      style={{ marginTop: '0.5rem' }}
                      onClick={() => setMeetingForm(addMeetingTimeSlot(meetingForm))}
                    >
                      + Adicionar horário
                    </button>
                  </div>
                  <label className={styles.field}>
                    Local da reunião
                    <input
                      value={meetingForm.location}
                      onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Responsável pela reunião
                    <input
                      value={meetingForm.responsible}
                      onChange={(e) => setMeetingForm({ ...meetingForm, responsible: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Status
                    <select
                      value={meetingForm.status}
                      onChange={(e) => setMeetingForm({ ...meetingForm, status: e.target.value })}
                    >
                      {MEETING_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={`${styles.field} ${styles.formRowFull}`}>
                    Descrição / Pauta da reunião
                    <textarea
                      rows={3}
                      value={meetingForm.description}
                      onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Anexar documento (opcional)
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setMeetingFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <div className={styles.formActions}>
                  <button type="button" className={styles.btn} disabled={meetingSubmitting} onClick={(e) => handleCreateMeeting(e, false)}>
                    {meetingSubmitting ? 'Salvando...' : 'Salvar rascunho'}
                  </button>
                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={meetingSubmitting}>
                    {meetingSubmitting ? 'Publicando...' : 'Publicar reunião'}
                  </button>
                </div>
              </form>

              {editingMeetingId && (
                <form onSubmit={(e) => handleUpdateMeeting(e, true)} style={{ marginBottom: '1rem', padding: '1rem', background: '#f4f7fb', borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0 }}>Editar reunião</h4>
                  <div className={styles.formRow}>
                    <label className={`${styles.field} ${styles.formRowFull}`}>
                      Título
                      <input required value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      Data
                      <input type="date" required value={meetingForm.startDateOnly} onChange={(e) => setMeetingForm({ ...meetingForm, startDateOnly: e.target.value })} />
                    </label>
                    <div className={`${styles.field} ${styles.formRowFull}`}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Horários</span>
                      {meetingForm.times.map((slot, timeIndex) => (
                        <div key={`edit-meeting-time-${timeIndex}`} className={styles.formRow} style={{ marginTop: '0.5rem', alignItems: 'end' }}>
                          <label className={styles.field}>
                            Início
                            <input
                              type="time"
                              required
                              value={slot.startTime}
                              onChange={(e) => setMeetingForm(updateMeetingTimeSlot(meetingForm, timeIndex, 'startTime', e.target.value))}
                            />
                          </label>
                          <label className={styles.field}>
                            Término
                            <input
                              type="time"
                              required
                              value={slot.endTime}
                              onChange={(e) => setMeetingForm(updateMeetingTimeSlot(meetingForm, timeIndex, 'endTime', e.target.value))}
                            />
                          </label>
                          {meetingForm.times.length > 1 && (
                            <button
                              type="button"
                              className={styles.btn}
                              onClick={() => setMeetingForm(removeMeetingTimeSlot(meetingForm, timeIndex))}
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.btn}
                        style={{ marginTop: '0.5rem' }}
                        onClick={() => setMeetingForm(addMeetingTimeSlot(meetingForm))}
                      >
                        + Adicionar horário
                      </button>
                    </div>
                    <label className={styles.field}>
                      Local
                      <input value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      Responsável
                      <input value={meetingForm.responsible} onChange={(e) => setMeetingForm({ ...meetingForm, responsible: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      Status
                      <select value={meetingForm.status} onChange={(e) => setMeetingForm({ ...meetingForm, status: e.target.value })}>
                        {MEETING_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className={`${styles.field} ${styles.formRowFull}`}>
                      Descrição / Pauta
                      <textarea rows={3} value={meetingForm.description} onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })} />
                    </label>
                    <label className={styles.field}>
                      Novo anexo (opcional)
                      <input type="file" accept=".pdf,image/*" onChange={(e) => setMeetingEditFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <div className={styles.formActions}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={meetingSubmitting}>Salvar</button>
                    <button type="button" className={styles.btn} onClick={() => setEditingMeetingId(null)}>Cancelar</button>
                  </div>
                </form>
              )}

              <h4>Reuniões cadastradas ({filteredMeetings.length}{meetingSearch.trim() ? ` de ${councilMeetings.length}` : ''})</h4>
              <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
                <label className={`${styles.field} ${styles.formRowFull}`}>
                  Buscar reunião
                  <input
                    type="search"
                    value={meetingSearch}
                    onChange={(e) => setMeetingSearch(e.target.value)}
                    placeholder="Filtrar por título, local, responsável..."
                  />
                </label>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Data/Horário</th>
                      <th>Local</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMeetings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.muted} style={{ textAlign: 'center', padding: '1rem' }}>
                          {councilMeetings.length === 0
                            ? 'Nenhuma reunião cadastrada para este conselho.'
                            : 'Nenhuma reunião corresponde à busca.'}
                        </td>
                      </tr>
                    ) : filteredMeetings.map((meeting) => (
                      <tr key={meeting._id}>
                        <td>{meeting.title}</td>
                        <td>
                          {meeting.startDateOnly ? `${meeting.startDateOnly.split('-').reverse().join('/')} ` : ''}
                          {formatMeetingTimesDisplay(meeting)}
                        </td>
                        <td>{meeting.location || '—'}</td>
                        <td>
                          {meeting.isPublic === false || meeting.status === 'inactive'
                            ? 'Rascunho'
                            : meetingStatusLabel(meeting.status, meeting.isPublic)}
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.btn} onClick={() => handleEditMeeting(meeting)}>Editar</button>
                            {(meeting.isPublic === false || meeting.status === 'inactive') && (
                              <button type="button" className={styles.btn} onClick={() => handlePublishMeeting(meeting._id)}>Publicar</button>
                            )}
                            <button type="button" className={styles.btn} onClick={() => handleDeleteMeeting(meeting._id)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subtab === 'categories' && !loading && (
            <>
              <form onSubmit={handleCreateCategory}>
                <h4>Nova categoria documental</h4>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    Slug
                    <input required value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} placeholder="atas" />
                  </label>
                  <label className={styles.field}>
                    Nome
                    <input required value={categoryForm.label} onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })} />
                  </label>
                  <label className={`${styles.field} ${styles.formRowFull}`}>
                    Tipos (vírgula)
                    <input value={categoryForm.documentTypes} onChange={(e) => setCategoryForm({ ...categoryForm, documentTypes: e.target.value })} placeholder="ata, parecer" />
                  </label>
                </div>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Criar categoria</button>
              </form>
              <h4>Categorias</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Nome</th><th>Slug</th><th>Tipos</th><th /></tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c._id}>
                        <td>{c.label}</td>
                        <td>{c.slug}</td>
                        <td>{(c.documentTypes || []).join(', ')}</td>
                        <td>
                          <button type="button" className={styles.btn} onClick={() => handleDeleteCategory(c._id)}>Remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subtab === 'assignments' && !loading && (
            <>
              <form onSubmit={handleCreateAssignment}>
                <h4>Vincular usuário ao conselho</h4>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    ID do usuário (MongoDB)
                    <input
                      required
                      value={assignForm.userId}
                      onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                      placeholder="ObjectId do usuário"
                    />
                  </label>
                  <label className={styles.field}>
                    Perfil
                    <select
                      value={assignForm.role}
                      onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
                    >
                      <option value="education_council">Conselho (gestão documental)</option>
                    </select>
                  </label>
                </div>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Vincular</button>
              </form>
              <h4>Vínculos ativos</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Usuário</th><th>Perfil</th><th /></tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a._id}>
                        <td>{a.userId?.name || a.userId?.email || a.userId}</td>
                        <td>{a.role}</td>
                        <td>
                          <button type="button" className={styles.btn} onClick={() => handleDeleteAssignment(a._id)}>
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
