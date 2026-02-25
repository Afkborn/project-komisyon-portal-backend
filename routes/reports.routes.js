const express = require("express");
const router = express.Router();
const reportsController = require("../controller/reports.controller");
const authMiddleware = require("../middleware/auth");
const Logger = require("../middleware/logger");

// GET Routes
router.get(
  "/eksikKatipAramasiYapilacakBirimler",
  authMiddleware,
  Logger("GET /eksikKatipAramasiYapilacakBirimler"),
  reportsController.getEksikKatipAramasiYapilacakBirimler
);

router.get(
  "/eksikKatibiOlanBirimler",
  authMiddleware,
  Logger("GET /eksikKatibiOlanBirimler"),
  reportsController.getEksikKatibiOlanBirimler
);

router.get(
  "/izinliPersoneller",
  authMiddleware,
  Logger("GET /izinliPersoneller"),
  reportsController.getIzinliPersoneller
);

router.get(
  "/partTimePersonnel",
  authMiddleware,
  Logger("GET /partTimePersonnel"),
  reportsController.getPartTimePersonnel
);

router.get(
  "/toplamPersonelSayisi",
  authMiddleware,
  Logger("GET /toplamPersonelSayisi"),
  reportsController.getToplamPersonelSayisi
);

router.get(
  "/personelTabloKontrolEdilecekBirimler",
  authMiddleware,
  Logger("GET /personelTabloKontrolEdilecekBirimler"),
  reportsController.getPersonelTabloKontrolEdilecekBirimler
);

router.get(
  "/personelTablo",
  authMiddleware,
  Logger("GET /personelTablo"),
  reportsController.getPersonelTablo
);

router.get(
  "/chartData",
  authMiddleware,
  Logger("GET /chartData"),
  reportsController.getChartData
);

router.get(
  "/infazKorumaMemurSayisi",
  authMiddleware,
  Logger("GET /infazKorumaMemurSayisi"),
  reportsController.getInfazKorumaMemurSayisi
);

router.get(
  "/urgentJobs",
  authMiddleware,
  Logger("GET /urgentJobs"),
  reportsController.getUrgentJobs
);

router.get(
  "/personnel-count",
  authMiddleware,
  reportsController.getPersonnelCount
);

router.get(
  "/expiring4BPersonnel",
  authMiddleware,
  Logger("GET /expiring4BPersonnel"),
  reportsController.getExpiring4BPersonnel
);

module.exports = router;
