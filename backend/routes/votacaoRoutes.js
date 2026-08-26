const express = require('express')
const rateLimit = require('express-rate-limit')

const verifyToken = require('../helpers/verify-token')
const verifyVotingJwt = require('../helpers/verify-voting-jwt')
const { requireVotingAdmin } = require('../helpers/authz')

const VotingAuthController = require('../controllers/VotingAuthController')
const VotingAdminController = require('../controllers/VotingAdminController')
const VotingEleitorController = require('../controllers/VotingEleitorController')
const VotingElectionAdminController = require('../controllers/VotingElectionAdminController')
const VotingBallotController = require('../controllers/VotingBallotController')
const VotingLandingController = require('../controllers/VotingLandingController')
const VotingAuditorController = require('../controllers/VotingAuditorController')
const VotingElectorateController = require('../controllers/VotingElectorateController')
const {
  requireVotingStaff,
  requireVotingPleitoRead,
  requireVotingPleitoWrite,
} = require('../helpers/voting-authz')
const { votingCandidateUploadMiddleware, votingBannerUploadMiddleware } = require('../helpers/voting-upload')

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/auth/login', authLimiter, VotingAuthController.login)
router.post('/auth/refresh', authLimiter, VotingAuthController.refresh)

router.get('/status', VotingEleitorController.publicStatus)

router.get('/pleitos/:slug', VotingLandingController.publicLanding)
router.post('/pleitos/:slug/unlock', authLimiter, VotingLandingController.unlockWithCpf)

router.get('/admin/me', verifyToken, requireVotingStaff, VotingAuditorController.me)
router.get('/admin/electorate-bases', verifyToken, requireVotingAdmin, VotingElectorateController.list)
router.post('/admin/electorate-bases/import', verifyToken, requireVotingAdmin, VotingElectorateController.createAndImport)
router.get('/admin/electorate-bases/:baseId/electors', verifyToken, requireVotingAdmin, VotingElectorateController.listElectors)
router.post('/admin/electorate-bases/:baseId/electors', verifyToken, requireVotingAdmin, VotingElectorateController.createElector)
router.patch('/admin/electorate-bases/:baseId/electors/:electorId', verifyToken, requireVotingAdmin, VotingElectorateController.updateElector)
router.delete('/admin/electorate-bases/:baseId/electors/:electorId', verifyToken, requireVotingAdmin, VotingElectorateController.deleteElector)
router.patch('/admin/votacoes/:id/electorate-base', verifyToken, requireVotingPleitoWrite, VotingElectorateController.assign)
router.get(
  '/admin/votacoes/:id/auditores',
  verifyToken,
  requireVotingPleitoRead,
  VotingAuditorController.list
)
router.post(
  '/admin/votacoes/:id/auditores',
  verifyToken,
  requireVotingPleitoWrite,
  VotingAuditorController.invite
)
router.patch(
  '/admin/votacoes/:id/auditores/:membershipId',
  verifyToken,
  requireVotingPleitoWrite,
  VotingAuditorController.revoke
)
router.post(
  '/admin/votacoes/:id/auditores/:membershipId/reset-password',
  verifyToken,
  requireVotingPleitoWrite,
  VotingAuditorController.resetPassword
)
router.get('/admin/dashboard', verifyToken, requireVotingStaff, VotingAdminController.dashboard)
router.get('/admin/votacoes', verifyToken, requireVotingStaff, VotingAdminController.listVotations)
router.post('/admin/votacoes', verifyToken, requireVotingAdmin, VotingAdminController.createVotation)
router.get('/admin/votacoes/:id/export.csv', verifyToken, requireVotingAdmin, VotingAdminController.exportCsv)
router.get('/admin/votacoes/:id', verifyToken, requireVotingPleitoRead, VotingAdminController.getVotation)
router.patch('/admin/votacoes/:id', verifyToken, requireVotingAdmin, votingBannerUploadMiddleware, VotingAdminController.patchVotation)
router.post('/admin/votacoes/:id/prepare-official', verifyToken, requireVotingAdmin, VotingAdminController.prepareOfficial)
router.post('/admin/votacoes/:id/candidates', verifyToken, requireVotingAdmin, VotingAdminController.addCandidate)
router.delete(
  '/admin/votacoes/:id/candidates/:candidateDocId',
  verifyToken,
  requireVotingAdmin,
  VotingAdminController.removeCandidate
)

router.get('/admin/servidores', verifyToken, requireVotingAdmin, VotingAdminController.listServidores)
router.post('/admin/servidores', verifyToken, requireVotingAdmin, VotingAdminController.createServidor)
router.post(
  '/admin/servidores/import',
  verifyToken,
  requireVotingAdmin,
  VotingElectionAdminController.importVoters
)

router.get(
  '/admin/votacoes/:id/detail',
  verifyToken,
  requireVotingPleitoRead,
  VotingElectionAdminController.getElectionDetail
)
router.get(
  '/admin/votacoes/:id/categories',
  verifyToken,
  requireVotingPleitoRead,
  VotingElectionAdminController.listCategories
)
router.post(
  '/admin/votacoes/:id/categories',
  verifyToken,
  requireVotingAdmin,
  VotingElectionAdminController.createCategory
)
router.patch(
  '/admin/votacoes/:id/categories/:categoryId',
  verifyToken,
  requireVotingAdmin,
  VotingElectionAdminController.patchCategory
)
router.delete(
  '/admin/votacoes/:id/categories/:categoryId',
  verifyToken,
  requireVotingAdmin,
  VotingElectionAdminController.deleteCategory
)
router.post(
  '/admin/votacoes/:id/candidates-v2',
  verifyToken,
  requireVotingAdmin,
  votingCandidateUploadMiddleware,
  VotingElectionAdminController.addCandidateV2
)
router.patch(
  '/admin/votacoes/:id/candidates-v2/:candidateDocId',
  verifyToken,
  requireVotingAdmin,
  votingCandidateUploadMiddleware,
  VotingElectionAdminController.patchCandidateV2
)
router.delete(
  '/admin/votacoes/:id/candidates-v2/:candidateDocId',
  verifyToken,
  requireVotingAdmin,
  VotingElectionAdminController.deleteCandidateV2
)
router.get(
  '/admin/votacoes/:id/resultado-v2',
  verifyToken,
  requireVotingPleitoRead,
  VotingElectionAdminController.resultsV2
)
router.get(
  '/admin/votacoes/:id/export-votos-v2.csv',
  verifyToken,
  requireVotingAdmin,
  VotingElectionAdminController.exportVotesV2
)
router.get(
  '/admin/votacoes/:id/export-resultado-v2.csv',
  verifyToken,
  requireVotingPleitoRead,
  VotingElectionAdminController.exportResultsV2
)
router.get(
  '/admin/votacoes/:id/export-comparecimento.csv',
  verifyToken,
  requireVotingAdmin,
  VotingElectionAdminController.exportParticipation
)

router.get('/votacoes', verifyVotingJwt, VotingEleitorController.listActive)
router.get('/votacoes/:id/ballot', verifyVotingJwt, VotingBallotController.ballot)
router.get('/votacoes/:id/status', verifyVotingJwt, VotingBallotController.myStatus)
router.post('/votacoes/:id/ballot', voteLimiter, verifyVotingJwt, VotingBallotController.submit)
router.get('/votacoes/:id/resultado-v2', VotingBallotController.publicResults)
router.get('/votacoes/:id/resultado', VotingEleitorController.results)
router.get('/votacoes/:id/me', verifyVotingJwt, VotingEleitorController.myVoteStatus)
router.post('/votacoes/:id/votar', voteLimiter, verifyVotingJwt, VotingEleitorController.vote)
router.get('/votacoes/:id', verifyVotingJwt, VotingEleitorController.getOne)

module.exports = router
