const router = require('express').Router()

const verifyToken = require('../helpers/verify-token')
const {
  attachEducationContext,
  requireEducationStaff,
  requireEducationAdmin,
} = require('../helpers/education-auth')
const {
  educationImageUpload,
  educationDocumentUpload,
  educationPostUploadMiddleware,
} = require('../helpers/education-upload')

const EducationEntityController = require('../controllers/EducationEntityController')
const EducationSchoolUnitController = require('../controllers/EducationSchoolUnitController')
const EducationPostController = require('../controllers/EducationPostController')
const EducationDocumentController = require('../controllers/EducationDocumentController')
const EducationLegislationController = require('../controllers/EducationLegislationController')
const EducationCalendarController = require('../controllers/EducationCalendarController')
const EducationGalleryController = require('../controllers/EducationGalleryController')
const EducationAssignmentController = require('../controllers/EducationAssignmentController')
const EducationCouncilMemberController = require('../controllers/EducationCouncilMemberController')
const EducationDocumentCategoryController = require('../controllers/EducationDocumentCategoryController')
const EducationLessonAssignmentController = require('../controllers/EducationLessonAssignmentController')
const EducationSearchController = require('../controllers/EducationSearchController')
const EducationMunicipalPlanController = require('../controllers/EducationMunicipalPlanController')
const EducationEarlyChildhoodPolicyController = require('../controllers/EducationEarlyChildhoodPolicyController')
const EducationSchoolMenuController = require('../controllers/EducationSchoolMenuController')

// ─── Rotas públicas ───────────────────────────────────────────────────────────

router.get('/', EducationEntityController.overview)
router.get('/search', EducationSearchController.search)
router.get('/entities', EducationEntityController.listPublic)
router.get('/entities/:slug', EducationEntityController.getBySlug)
router.get('/school-units', EducationSchoolUnitController.listPublic)
router.get('/school-units/:slug', EducationSchoolUnitController.getBySlug)
router.get('/news', EducationPostController.listNews)
router.get('/news/:slug', EducationPostController.getBySlug)
router.get('/councils', EducationEntityController.listCouncils)
router.get('/councils/:slug', EducationEntityController.getBySlug)
router.get('/council-members', EducationCouncilMemberController.listPublic)
router.get('/document-categories', EducationDocumentCategoryController.listPublic)
router.get('/legislation', EducationLegislationController.listPublic)
router.get('/legislation/:id', EducationLegislationController.getById)
router.get('/municipal-plans', EducationMunicipalPlanController.listPublic)
router.get('/municipal-plans/:id', EducationMunicipalPlanController.getById)
router.get('/early-childhood-policies', EducationEarlyChildhoodPolicyController.listPublic)
router.get('/early-childhood-policies/:id', EducationEarlyChildhoodPolicyController.getById)
router.get('/school-menus', EducationSchoolMenuController.listPublic)
router.get('/school-menus/:id', EducationSchoolMenuController.getById)
router.get('/transparency', EducationDocumentController.listTransparency)
router.get('/calendar', EducationCalendarController.listPublic)
router.get('/calendar/:id', EducationCalendarController.getByIdPublic)
router.get('/lesson-assignments/upcoming', EducationLessonAssignmentController.listUpcoming)
router.get('/lesson-assignments', EducationLessonAssignmentController.listPublic)
router.get('/lesson-assignments/:id', EducationLessonAssignmentController.getByIdPublic)
router.get('/partner-entities', EducationEntityController.listPartnerEntitiesPublic)
router.get('/partner-entities/:slug', EducationEntityController.getPartnerBySlug)
router.get('/galleries', EducationGalleryController.listPublic)
router.get('/galleries/:id', EducationGalleryController.getById)
router.get('/documents', EducationDocumentController.listPublic)
router.get('/documents/:id', EducationDocumentController.getById)

// ─── Middleware admin ─────────────────────────────────────────────────────────

const adminChain = [verifyToken, attachEducationContext, requireEducationStaff]
const adminOnlyChain = [verifyToken, attachEducationContext, requireEducationAdmin]

// ─── Dashboard ────────────────────────────────────────────────────────────────

router.get('/admin/dashboard', ...adminChain, EducationAssignmentController.dashboard)

// ─── Vínculos usuário ↔ entidade (somente admin do módulo) ───────────────────

router.get('/admin/assignments', ...adminOnlyChain, EducationAssignmentController.list)
router.post('/admin/assignments/by-email', ...adminOnlyChain, EducationAssignmentController.createByEmail)
router.post('/admin/assignments', ...adminOnlyChain, EducationAssignmentController.create)
router.delete('/admin/assignments/:id', ...adminOnlyChain, EducationAssignmentController.remove)

// ─── Entidades ────────────────────────────────────────────────────────────────

router.get('/admin/entities', ...adminChain, EducationEntityController.listAdmin)
router.post(
  '/admin/entities',
  ...adminOnlyChain,
  educationImageUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
    { name: 'managerPhoto', maxCount: 1 },
  ]),
  EducationEntityController.create
)
router.put(
  '/admin/entities/:id',
  ...adminChain,
  educationImageUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
    { name: 'managerPhoto', maxCount: 1 },
  ]),
  EducationEntityController.update
)
router.delete('/admin/entities/:id', ...adminOnlyChain, EducationEntityController.remove)

const schoolUnitImageUpload = educationImageUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'managerPhoto', maxCount: 1 },
])

// ─── Unidades escolares ───────────────────────────────────────────────────────

router.get('/admin/school-units', ...adminChain, EducationSchoolUnitController.listAdmin)
router.get('/admin/school-units/:id', ...adminChain, EducationSchoolUnitController.getById)
router.post(
  '/admin/school-units',
  ...adminOnlyChain,
  schoolUnitImageUpload,
  EducationSchoolUnitController.create
)
router.put(
  '/admin/school-units/:id',
  ...adminChain,
  schoolUnitImageUpload,
  EducationSchoolUnitController.update
)
router.patch('/admin/school-units/:id/activate', ...adminChain, EducationSchoolUnitController.activate)
router.patch('/admin/school-units/:id/deactivate', ...adminChain, EducationSchoolUnitController.deactivate)
router.delete('/admin/school-units/:id', ...adminOnlyChain, EducationSchoolUnitController.remove)

// ─── Publicações (posts) ──────────────────────────────────────────────────────

router.get('/admin/posts', ...adminChain, EducationPostController.listAdmin)
router.post(
  '/admin/posts',
  ...adminChain,
  educationPostUploadMiddleware,
  EducationPostController.create
)
router.put(
  '/admin/posts/:id',
  ...adminChain,
  educationPostUploadMiddleware,
  EducationPostController.update
)
router.patch('/admin/posts/:id/publish', ...adminChain, EducationPostController.publish)
router.patch('/admin/posts/:id/archive', ...adminChain, EducationPostController.archive)
router.delete('/admin/posts/:id', ...adminChain, EducationPostController.remove)

// ─── Documentos ───────────────────────────────────────────────────────────────

router.get('/admin/documents', ...adminChain, EducationDocumentController.listAdmin)
router.post(
  '/admin/documents',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationDocumentController.create
)
router.put(
  '/admin/documents/:id',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationDocumentController.update
)
router.patch('/admin/documents/:id/publish', ...adminChain, EducationDocumentController.publish)
router.patch('/admin/documents/:id/submit-review', ...adminChain, EducationDocumentController.submitReview)
router.patch('/admin/documents/:id/reject-review', ...adminChain, EducationDocumentController.rejectReview)
router.patch('/admin/documents/:id/archive', ...adminChain, EducationDocumentController.archive)
router.delete('/admin/documents/:id', ...adminChain, EducationDocumentController.remove)

// ─── Membros de conselhos ─────────────────────────────────────────────────────

router.get('/admin/council-members', ...adminChain, EducationCouncilMemberController.listAdmin)
router.post('/admin/council-members', ...adminChain, EducationCouncilMemberController.create)
router.put('/admin/council-members/:id', ...adminChain, EducationCouncilMemberController.update)
router.delete('/admin/council-members/:id', ...adminChain, EducationCouncilMemberController.remove)

// ─── Categorias documentais ───────────────────────────────────────────────────

router.get('/admin/document-categories', ...adminChain, EducationDocumentCategoryController.listAdmin)
router.post('/admin/document-categories', ...adminChain, EducationDocumentCategoryController.create)
router.put('/admin/document-categories/:id', ...adminChain, EducationDocumentCategoryController.update)
router.delete('/admin/document-categories/:id', ...adminChain, EducationDocumentCategoryController.remove)

// ─── Legislação ───────────────────────────────────────────────────────────────

router.get('/admin/legislation', ...adminChain, EducationLegislationController.listAdmin)
router.post(
  '/admin/legislation',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationLegislationController.create
)
router.put(
  '/admin/legislation/:id',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationLegislationController.update
)
router.delete('/admin/legislation/:id', ...adminChain, EducationLegislationController.remove)

// ─── Plano Municipal da Educação ───────────────────────────────────────────────

router.get('/admin/municipal-plans', ...adminChain, EducationMunicipalPlanController.listAdmin)
router.post(
  '/admin/municipal-plans',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationMunicipalPlanController.create
)
router.put(
  '/admin/municipal-plans/:id',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationMunicipalPlanController.update
)
router.delete('/admin/municipal-plans/:id', ...adminChain, EducationMunicipalPlanController.remove)

// ─── Política Municipal de Qualidade e Equidade da Educação Infantil ──────────

router.get('/admin/early-childhood-policies', ...adminChain, EducationEarlyChildhoodPolicyController.listAdmin)
router.post(
  '/admin/early-childhood-policies',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationEarlyChildhoodPolicyController.create
)
router.put(
  '/admin/early-childhood-policies/:id',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationEarlyChildhoodPolicyController.update
)
router.delete('/admin/early-childhood-policies/:id', ...adminChain, EducationEarlyChildhoodPolicyController.remove)

// ─── Cardápio Escolar ─────────────────────────────────────────────────────────

router.get('/admin/school-menus', ...adminChain, EducationSchoolMenuController.listAdmin)
router.post(
  '/admin/school-menus',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationSchoolMenuController.create
)
router.put(
  '/admin/school-menus/:id',
  ...adminChain,
  educationDocumentUpload.single('file'),
  EducationSchoolMenuController.update
)
router.delete('/admin/school-menus/:id', ...adminChain, EducationSchoolMenuController.remove)

// ─── Calendário ───────────────────────────────────────────────────────────────

router.get('/admin/calendar/notifications', ...adminChain, EducationCalendarController.upcomingNotifications)
router.get('/admin/calendar', ...adminChain, EducationCalendarController.listAdmin)
router.get('/admin/calendar/:id', ...adminChain, EducationCalendarController.getByIdAdmin)
router.post(
  '/admin/calendar',
  ...adminChain,
  educationDocumentUpload.array('attachments', 10),
  EducationCalendarController.create
)
router.put(
  '/admin/calendar/:id',
  ...adminChain,
  educationDocumentUpload.array('attachments', 10),
  EducationCalendarController.update
)
router.post('/admin/calendar/:id/duplicate', ...adminChain, EducationCalendarController.duplicate)
router.patch('/admin/calendar/:id/activate', ...adminChain, EducationCalendarController.activate)
router.patch('/admin/calendar/:id/deactivate', ...adminChain, EducationCalendarController.deactivate)
router.patch('/admin/calendar/:id/cancel', ...adminChain, EducationCalendarController.cancel)
router.patch('/admin/calendar/:id/complete', ...adminChain, EducationCalendarController.complete)
router.patch('/admin/calendar/:id/reactivate', ...adminChain, EducationCalendarController.reactivate)
router.delete('/admin/calendar/:id', ...adminChain, EducationCalendarController.remove)

// ─── Atribuição de Aulas ──────────────────────────────────────────────────────

router.get('/admin/lesson-assignments', ...adminChain, EducationLessonAssignmentController.listAdmin)
router.get('/admin/lesson-assignments/:id', ...adminChain, EducationLessonAssignmentController.getByIdAdmin)
router.post(
  '/admin/lesson-assignments',
  ...adminChain,
  educationDocumentUpload.array('documents', 20),
  EducationLessonAssignmentController.create
)
router.put(
  '/admin/lesson-assignments/:id',
  ...adminChain,
  educationDocumentUpload.array('documents', 20),
  EducationLessonAssignmentController.update
)
router.patch('/admin/lesson-assignments/:id/publish', ...adminChain, EducationLessonAssignmentController.publish)
router.patch('/admin/lesson-assignments/:id/archive', ...adminChain, EducationLessonAssignmentController.archive)
router.delete('/admin/lesson-assignments/:id', ...adminChain, EducationLessonAssignmentController.remove)

// ─── Entidades Conveniadas (marca unidades existentes) ────────────────────────

router.get('/admin/partner-entities', ...adminChain, EducationEntityController.listPartnerEntitiesAdmin)
router.patch('/admin/partner-entities/:id', ...adminChain, EducationEntityController.setPartnerStatus)

// ─── Galerias ─────────────────────────────────────────────────────────────────

router.get('/admin/galleries', ...adminChain, EducationGalleryController.listAdmin)
router.post(
  '/admin/galleries',
  ...adminChain,
  educationImageUpload.array('images', 20),
  EducationGalleryController.create
)
router.put(
  '/admin/galleries/:id',
  ...adminChain,
  educationImageUpload.array('images', 20),
  EducationGalleryController.update
)
router.delete('/admin/galleries/:id', ...adminChain, EducationGalleryController.remove)

module.exports = router
