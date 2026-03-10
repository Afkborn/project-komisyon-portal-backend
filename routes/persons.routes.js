const express = require("express");
const router = express.Router();
const personsController = require("../controller/persons.controller");
const authMiddleware = require("../middleware/auth");
const checkRoles = require("../middleware/checkRoles");
const createPictureUploadMiddleware = require("../middleware/profilePictureUpload");
const personPhotoUpload = createPictureUploadMiddleware("persons");

// Route sırası önemlidir: Daha spesifik olanlar genel olanlardan önce

// GET Routes (spesifikten generale)
router.get(
  "/byAdSoyad",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getPersonByAdSoyad,
);
router.get(
  "/bySicil/:sicil",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getPersonBySicil,
);
router.get(
  "/byId/:id",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getPersonById,
);
router.get(
  "/attributeList",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getAttributeList,
);
router.get(
  "/deactivated",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getDeactivatedPersons,
);
router.get(
  "/temporary",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getTemporaryPersons,
);
router.get(
  "/suspended",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getSuspendedPersons,
);
router.get(
  "/disabled",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getDisabledPersons,
);
router.get(
  "/martyrRelative",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getMartyrRelativePersons,
);

// Genel GET routes
router.get(
  "/",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getActivatePersons,
);
router.get(
  "/:birimID",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.getPersonsByBirimId,
);

// POST Route
router.post(
  "/",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.createPerson,
);

// PUT Routes
router.put(
  "/updateBySicil/:sicil",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.updatePersonBySicil,
);
router.put(
  "/:id",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.updatePersonById,
);
router.put(
  "/:id/photo",
  authMiddleware,
  personPhotoUpload.single("photo"),
  personsController.uploadPersonPhoto,
);

// DELETE Route
router.delete(
  "/:id/photo",
  authMiddleware,
  personsController.deletePersonPhoto,
);
router.delete(
  "/:id",
  authMiddleware,
  checkRoles([2, 3, 5, 8]),
  personsController.deletePerson,
);

module.exports = router;
