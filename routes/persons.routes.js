const express = require("express");
const router = express.Router();
const personsController = require("../controller/persons.controller");
const authMiddleware = require("../middleware/auth");

// Route sırası önemlidir: Daha spesifik olanlar genel olanlardan önce

// GET Routes (spesifikten generale)
router.get("/byAdSoyad", authMiddleware, personsController.getPersonByAdSoyad);
router.get("/bySicil/:sicil", authMiddleware, personsController.getPersonBySicil);
router.get("/byId/:id", authMiddleware, personsController.getPersonById);
router.get("/attributeList", authMiddleware, personsController.getAttributeList);
router.get("/deactivated", authMiddleware, personsController.getDeactivatedPersons);
router.get("/temporary", authMiddleware, personsController.getTemporaryPersons);
router.get("/suspended", authMiddleware, personsController.getSuspendedPersons);
router.get("/disabled", authMiddleware, personsController.getDisabledPersons);
router.get("/martyrRelative", authMiddleware, personsController.getMartyrRelativePersons);

// Genel GET routes
router.get("/", authMiddleware, personsController.getActivatePersons);
router.get("/:birimID", authMiddleware, personsController.getPersonsByBirimId);

// POST Route
router.post("/", authMiddleware, personsController.createPerson);

// PUT Routes
router.put("/updateBySicil/:sicil", authMiddleware, personsController.updatePersonBySicil);
router.put("/:id", authMiddleware, personsController.updatePersonById);

// DELETE Route
router.delete("/:id", authMiddleware, personsController.deletePerson);

module.exports = router;
