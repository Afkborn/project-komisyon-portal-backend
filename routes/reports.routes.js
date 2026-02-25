const express = require("express");
const router = express.Router();
const reportsController = require("../controller/reports.controller");
const authMiddleware = require("../middleware/auth");
const checkRoles = require("../middleware/checkRoles");
const Logger = require("../middleware/logger");

// GET Routes
router.get(
  "/eksikKatipAramasiYapilacakBirimler",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /eksikKatipAramasiYapilacakBirimler"),
  reportsController.getEksikKatipAramasiYapilacakBirimler
);

router.get(
  "/eksikKatibiOlanBirimler",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /eksikKatibiOlanBirimler"),
  reportsController.getEksikKatibiOlanBirimler
);

router.get(
  "/izinliPersoneller",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /izinliPersoneller"),
  reportsController.getIzinliPersoneller
);

router.get(
  "/partTimePersonnel",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /partTimePersonnel"),
  reportsController.getPartTimePersonnel
);

router.get(
  "/toplamPersonelSayisi",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /toplamPersonelSayisi"),
  reportsController.getToplamPersonelSayisi
);

router.get(
  "/personelTabloKontrolEdilecekBirimler",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /personelTabloKontrolEdilecekBirimler"),
  reportsController.getPersonelTabloKontrolEdilecekBirimler
);

router.get(
  "/personelTablo",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /personelTablo"),
  reportsController.getPersonelTablo
);

router.get(
  "/chartData",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /chartData"),
  reportsController.getChartData
);

router.get(
  "/infazKorumaMemurSayisi",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /infazKorumaMemurSayisi"),
  reportsController.getInfazKorumaMemurSayisi
);

router.get(
  "/urgentJobs",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /urgentJobs"),
  reportsController.getUrgentJobs
);

router.get(
  "/personnel-count",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  reportsController.getPersonnelCount
);

router.get(
  "/expiring4BPersonnel",
  authMiddleware,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /expiring4BPersonnel"),
  reportsController.getExpiring4BPersonnel
);

module.exports = router;
