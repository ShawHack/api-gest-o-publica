import api from '../utils/api'

const BASE = '/education'

export function overview() {
  return api.get(BASE)
}

export function listEntities(params = {}) {
  return api.get(`${BASE}/entities`, { params })
}

export function getEntity(slug) {
  return api.get(`${BASE}/entities/${encodeURIComponent(slug)}`)
}

export function listNews(params = {}) {
  return api.get(`${BASE}/news`, { params })
}

export function listFeaturedNews(params = {}) {
  return api.get(`${BASE}/news`, { params: { featured: true, limit: 50, ...params } })
}

export function getNews(slug, params = {}) {
  return api.get(`${BASE}/news/${encodeURIComponent(slug)}`, { params })
}

export function listCouncils() {
  return api.get(`${BASE}/councils`)
}

export function getCouncil(slug) {
  return api.get(`${BASE}/councils/${encodeURIComponent(slug)}`)
}

export function listLegislation(params = {}) {
  return api.get(`${BASE}/legislation`, { params })
}

export function searchEducation(params = {}) {
  return api.get(`${BASE}/search`, { params })
}

export function getLegislation(id) {
  return api.get(`${BASE}/legislation/${id}`)
}

export function listTransparency(params = {}) {
  return api.get(`${BASE}/transparency`, { params })
}

export function listCalendar(params = {}) {
  return api.get(`${BASE}/calendar`, { params })
}

export function listUpcomingEvents(limit = 5) {
  return api.get(`${BASE}/calendar`, { params: { upcoming: true, limit } })
}

export function listGalleries(params = {}) {
  return api.get(`${BASE}/galleries`, { params })
}

export function getGallery(id) {
  return api.get(`${BASE}/galleries/${id}`)
}

export function listDocuments(params = {}) {
  return api.get(`${BASE}/documents`, { params })
}

export function getDocument(id) {
  return api.get(`${BASE}/documents/${id}`)
}

export function listDocumentCategories(params = {}) {
  return api.get(`${BASE}/document-categories`, { params })
}

export function listCouncilMembers(params = {}) {
  return api.get(`${BASE}/council-members`, { params })
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export function getAdminDashboard() {
  return api.get(`${BASE}/admin/dashboard`)
}

export function listAdminEntities(params = {}) {
  return api.get(`${BASE}/admin/entities`, { params })
}

export function createEntity(data) {
  return api.post(`${BASE}/admin/entities`, data)
}

export function updateEntity(id, data) {
  return api.put(`${BASE}/admin/entities/${id}`, data)
}

export function deleteEntity(id) {
  return api.delete(`${BASE}/admin/entities/${id}`)
}

export function listSchoolUnits(params = {}) {
  return api.get(`${BASE}/school-units`, { params })
}

export function getSchoolUnit(slug) {
  return api.get(`${BASE}/school-units/${encodeURIComponent(slug)}`)
}

export function listAdminSchoolUnits(params = {}) {
  return api.get(`${BASE}/admin/school-units`, { params })
}

export function getAdminSchoolUnit(id) {
  return api.get(`${BASE}/admin/school-units/${id}`)
}

export function createSchoolUnit(data) {
  return api.post(`${BASE}/admin/school-units`, data)
}

export function updateSchoolUnit(id, data) {
  return api.put(`${BASE}/admin/school-units/${id}`, data)
}

export function activateSchoolUnit(id) {
  return api.patch(`${BASE}/admin/school-units/${id}/activate`)
}

export function deactivateSchoolUnit(id) {
  return api.patch(`${BASE}/admin/school-units/${id}/deactivate`)
}

export function deleteSchoolUnit(id) {
  return api.delete(`${BASE}/admin/school-units/${id}`)
}

export function listAdminPosts(params = {}) {
  return api.get(`${BASE}/admin/posts`, { params })
}

export function createPost(data) {
  if (data instanceof FormData) {
    // Não definir Content-Type manualmente — o browser/axios inclui o boundary
    return api.post(`${BASE}/admin/posts`, data)
  }
  return api.post(`${BASE}/admin/posts`, data)
}

export function updatePost(id, data) {
  if (data instanceof FormData) {
    return api.put(`${BASE}/admin/posts/${id}`, data)
  }
  return api.put(`${BASE}/admin/posts/${id}`, data)
}

export function publishPost(id) {
  return api.patch(`${BASE}/admin/posts/${id}/publish`)
}

export function archivePost(id) {
  return api.patch(`${BASE}/admin/posts/${id}/archive`)
}

export function deletePost(id) {
  return api.delete(`${BASE}/admin/posts/${id}`)
}

export function listAdminDocuments(params = {}) {
  return api.get(`${BASE}/admin/documents`, { params })
}

export function createDocument(data) {
  if (data instanceof FormData) {
    return api.post(`${BASE}/admin/documents`, data)
  }
  return api.post(`${BASE}/admin/documents`, data)
}

export function updateDocument(id, data) {
  if (data instanceof FormData) {
    return api.put(`${BASE}/admin/documents/${id}`, data)
  }
  return api.put(`${BASE}/admin/documents/${id}`, data)
}

export function publishDocument(id) {
  return api.patch(`${BASE}/admin/documents/${id}/publish`)
}

export function submitDocumentReview(id) {
  return api.patch(`${BASE}/admin/documents/${id}/submit-review`)
}

export function rejectDocumentReview(id) {
  return api.patch(`${BASE}/admin/documents/${id}/reject-review`)
}

export function archiveDocument(id) {
  return api.patch(`${BASE}/admin/documents/${id}/archive`)
}

export function deleteDocument(id) {
  return api.delete(`${BASE}/admin/documents/${id}`)
}

export function listAdminCouncilMembers(params = {}) {
  return api.get(`${BASE}/admin/council-members`, { params })
}

export function createCouncilMember(data) {
  return api.post(`${BASE}/admin/council-members`, data)
}

export function updateCouncilMember(id, data) {
  return api.put(`${BASE}/admin/council-members/${id}`, data)
}

export function deleteCouncilMember(id) {
  return api.delete(`${BASE}/admin/council-members/${id}`)
}

export function listAdminDocumentCategories(params = {}) {
  return api.get(`${BASE}/admin/document-categories`, { params })
}

export function createDocumentCategory(data) {
  return api.post(`${BASE}/admin/document-categories`, data)
}

export function deleteDocumentCategory(id) {
  return api.delete(`${BASE}/admin/document-categories/${id}`)
}

export function listAdminCalendar(params = {}) {
  return api.get(`${BASE}/admin/calendar`, { params })
}

export function getAdminCalendarEvent(id) {
  return api.get(`${BASE}/admin/calendar/${id}`)
}

export function getCalendarNotifications(params = {}) {
  return api.get(`${BASE}/admin/calendar/notifications`, { params })
}

export function createCalendarEvent(data) {
  return api.post(`${BASE}/admin/calendar`, data)
}

export function updateCalendarEvent(id, data) {
  return api.put(`${BASE}/admin/calendar/${id}`, data)
}

export function duplicateCalendarEvent(id, data = {}) {
  return api.post(`${BASE}/admin/calendar/${id}/duplicate`, data)
}

export function cancelCalendarEvent(id) {
  return api.patch(`${BASE}/admin/calendar/${id}/cancel`)
}

export function completeCalendarEvent(id) {
  return api.patch(`${BASE}/admin/calendar/${id}/complete`)
}

export function activateCalendarEvent(id) {
  return api.patch(`${BASE}/admin/calendar/${id}/activate`)
}

export function deactivateCalendarEvent(id) {
  return api.patch(`${BASE}/admin/calendar/${id}/deactivate`)
}

export function reactivateCalendarEvent(id) {
  return api.patch(`${BASE}/admin/calendar/${id}/reactivate`)
}

export function deleteCalendarEvent(id) {
  return api.delete(`${BASE}/admin/calendar/${id}`)
}

export function listAssignments(params = {}) {
  return api.get(`${BASE}/admin/assignments`, { params })
}

export function createAssignment(data) {
  return api.post(`${BASE}/admin/assignments`, data)
}

export function createAssignmentByEmail(data) {
  return api.post(`${BASE}/admin/assignments/by-email`, data)
}

export function deleteAssignment(id) {
  return api.delete(`${BASE}/admin/assignments/${id}`)
}

export function listAdminGalleries(params = {}) {
  return api.get(`${BASE}/admin/galleries`, { params })
}

export function createGallery(data) {
  if (data instanceof FormData) {
    return api.post(`${BASE}/admin/galleries`, data)
  }
  return api.post(`${BASE}/admin/galleries`, data)
}

export function deleteGallery(id) {
  return api.delete(`${BASE}/admin/galleries/${id}`)
}

export function updateGallery(id, data) {
  if (data instanceof FormData) {
    return api.put(`${BASE}/admin/galleries/${id}`, data)
  }
  return api.put(`${BASE}/admin/galleries/${id}`, data)
}

export function listAdminLegislation(params = {}) {
  return api.get(`${BASE}/admin/legislation`, { params })
}

export function createLegislation(data) {
  if (data instanceof FormData) {
    return api.post(`${BASE}/admin/legislation`, data)
  }
  return api.post(`${BASE}/admin/legislation`, data)
}

export function updateLegislation(id, data) {
  if (data instanceof FormData) {
    return api.put(`${BASE}/admin/legislation/${id}`, data)
  }
  return api.put(`${BASE}/admin/legislation/${id}`, data)
}

export function deleteLegislation(id) {
  return api.delete(`${BASE}/admin/legislation/${id}`)
}

export function listMunicipalPlans(params = {}) {
  return api.get(`${BASE}/municipal-plans`, { params })
}

export function getMunicipalPlan(id) {
  return api.get(`${BASE}/municipal-plans/${id}`)
}

export function listAdminMunicipalPlans(params = {}) {
  return api.get(`${BASE}/admin/municipal-plans`, { params })
}

export function createMunicipalPlan(data) {
  return api.post(`${BASE}/admin/municipal-plans`, data)
}

export function updateMunicipalPlan(id, data) {
  return api.put(`${BASE}/admin/municipal-plans/${id}`, data)
}

export function deleteMunicipalPlan(id) {
  return api.delete(`${BASE}/admin/municipal-plans/${id}`)
}

export function listEarlyChildhoodPolicies(params = {}) {
  return api.get(`${BASE}/early-childhood-policies`, { params })
}

export function getEarlyChildhoodPolicy(id) {
  return api.get(`${BASE}/early-childhood-policies/${id}`)
}

export function listAdminEarlyChildhoodPolicies(params = {}) {
  return api.get(`${BASE}/admin/early-childhood-policies`, { params })
}

export function createEarlyChildhoodPolicy(data) {
  return api.post(`${BASE}/admin/early-childhood-policies`, data)
}

export function updateEarlyChildhoodPolicy(id, data) {
  return api.put(`${BASE}/admin/early-childhood-policies/${id}`, data)
}

export function deleteEarlyChildhoodPolicy(id) {
  return api.delete(`${BASE}/admin/early-childhood-policies/${id}`)
}

export function listSchoolMenus(params = {}) {
  return api.get(`${BASE}/school-menus`, { params })
}

export function getSchoolMenu(id) {
  return api.get(`${BASE}/school-menus/${id}`)
}

export function listAdminSchoolMenus(params = {}) {
  return api.get(`${BASE}/admin/school-menus`, { params })
}

export function createSchoolMenu(data) {
  return api.post(`${BASE}/admin/school-menus`, data)
}

export function updateSchoolMenu(id, data) {
  return api.put(`${BASE}/admin/school-menus/${id}`, data)
}

export function deleteSchoolMenu(id) {
  return api.delete(`${BASE}/admin/school-menus/${id}`)
}

// ─── Atribuição de Aulas ─────────────────────────────────────────────────────

export function listLessonAssignments(params = {}) {
  return api.get(`${BASE}/lesson-assignments`, { params })
}

export function listUpcomingLessonAssignments(limit = 6) {
  return api.get(`${BASE}/lesson-assignments/upcoming`, { params: { limit } })
}

export function getLessonAssignment(id) {
  return api.get(`${BASE}/lesson-assignments/${id}`)
}

export function listAdminLessonAssignments(params = {}) {
  return api.get(`${BASE}/admin/lesson-assignments`, { params })
}

export function getAdminLessonAssignment(id) {
  return api.get(`${BASE}/admin/lesson-assignments/${id}`)
}

export function createLessonAssignment(data) {
  return api.post(`${BASE}/admin/lesson-assignments`, data)
}

export function updateLessonAssignment(id, data) {
  return api.put(`${BASE}/admin/lesson-assignments/${id}`, data)
}

export function publishLessonAssignment(id) {
  return api.patch(`${BASE}/admin/lesson-assignments/${id}/publish`)
}

export function archiveLessonAssignment(id) {
  return api.patch(`${BASE}/admin/lesson-assignments/${id}/archive`)
}

export function deleteLessonAssignment(id) {
  return api.delete(`${BASE}/admin/lesson-assignments/${id}`)
}

// ─── Entidades Conveniadas ────────────────────────────────────────────────────

export function listPartnerEntities(params = {}) {
  return api.get(`${BASE}/partner-entities`, { params })
}

export function getPartnerEntity(slug) {
  return api.get(`${BASE}/partner-entities/${encodeURIComponent(slug)}`)
}

export function listAdminPartnerEntities(params = {}) {
  return api.get(`${BASE}/admin/partner-entities`, { params })
}

export function setPartnerEntityStatus(id, isPartnerEntity) {
  return api.patch(`${BASE}/admin/partner-entities/${id}`, { isPartnerEntity })
}
