// routes/userRoutes.js

const express = require("express");
const router = express.Router();

const UserController = require("../controllers/UserController");
const verifyToken = require("../helpers/verify-token");
const { imageUpload } = require("../helpers/image-upload");
const { requireSelfOrAdmin } = require("../helpers/authz");
const { requireRole } = require('../helpers/authz')

// Auth & leitura
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/refresh", UserController.refresh);
router.post("/logout", UserController.logout);
router.get("/checkuser", UserController.checkUser);
router.get("/check", UserController.checkUser); // alias - algum frontend antigo usa /check

// E-mail & senha
router.get("/verify-email", UserController.verifyEmail);
router.post("/forgot-password", UserController.forgotPassword);
router.post("/reset-password", UserController.resetPassword);
// routes/userRoutes.js
router.post('/resend-verification', UserController.resendVerification);




// Admin-only (listagem/criação/role/delete)
router.get("/", verifyToken, UserController.list);
router.post("/admin-create", verifyToken, requireRole('admin'), imageUpload.single("image"), UserController.adminCreateUser);
router.patch("/:id/role", verifyToken, UserController.setRole);
router.delete("/:id", verifyToken, UserController.remove);

// ✨ EDITAR PERFIL — self OU admin (RESTful)
router.patch(
  "/:id",
  verifyToken,
  requireSelfOrAdmin("id"),
  imageUpload.single("image"),
  UserController.editUser
);

// (opcional) alias de compatibilidade por um tempo:
router.patch(
  "/edit/:id",
  verifyToken,
  requireSelfOrAdmin("id"),
  imageUpload.single("image"),
  UserController.editUser
);



router.post(
  "/admin-create",
  verifyToken,
  requireRole('admin'),
  imageUpload.single("image"),
  UserController.adminCreateUser
);


// routes/users.js
router.get('/concessionarios', verifyToken, requireRole('admin'), UserController.listConcessionarios)

// ===============================================
//          ROTAS ESPECÍFICAS SEMIT_A_PET
// ===============================================

// Listar institutos (público)
router.get('/institutes', UserController.getInstitutes)

// Admin criar usuário (SEMIT_A_PET)
router.post('/admin/create', verifyToken, requireRole('admin'), UserController.createUserByAdmin)

// Admin deletar usuário criado por ele
router.delete('/admin/delete/:id', verifyToken, requireRole('admin'), UserController.deleteUserByAdmin)

// Alternar permissão de gerenciamento de árvores
router.patch('/admin/toggle-tree/:id', verifyToken, requireRole('admin'), UserController.toggleTreePermission)

// Listar usuários criados pelo admin
router.get('/admin/all', verifyToken, requireRole('admin'), UserController.getAllUsersByAdmin)

// Buscar por id (deixe por último entre as GET específicas)
router.get("/:id", verifyToken, requireSelfOrAdmin("id"), UserController.getUserById);

module.exports = router;
