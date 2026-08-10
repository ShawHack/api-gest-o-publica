// routes/ServiceRoutes.js

const express = require("express");
const router = express.Router();
const { imageUpload } = require("../helpers/image-upload");
const path = require("path");
const { BASE_DIR } = require("../helpers/image-upload");

// Upload de imagem para serviços
router.post(
  "/upload-image",
  imageUpload.single("image"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem enviada" });
      }

      // O multer já salvou o arquivo em /data/apicemiterio/services
      // Retorna a URL relativa que será servida pelo express.static
      const filename = path.basename(req.file.path);
      const imageUrl = `/images/services/${filename}`;

      res.json({
        message: "Imagem enviada com sucesso",
        imageUrl: imageUrl,
        filename: filename,
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      res.status(500).json({ error: "Erro ao fazer upload da imagem" });
    }
  }
);

module.exports = router;

