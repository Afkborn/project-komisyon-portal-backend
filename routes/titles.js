const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const Title = require("../model/Title");
const { Person } = require("../model/Person");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

// get all titles

router.get("/", auth, Logger("GET /titles/"), (request, response) => {
  Title.find()
    .then((titles) => {
      response.send({
        success: true,
        titleList: titles,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.TITLE_NOT_FOUND,
      });
    });
});

// post a title
router.post("/", auth, Logger("POST /titles/"), (request, response) => {
  const title = new Title({
    name: request.body.name,
    kind: request.body.kind,
    deletable: request.body.deletable,
    oncelikSirasi: request.body.oncelikSirasi,
  });

  title
    .save()
    .then((data) => {
      recordActivity(
        request.user.id,
        RequestTypeList.TITLE_CREATE,
        null,
        null,
        data._id
      );

      response.send(data);
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.TITLE_NOT_SAVED,
      });
    });
});

// update a title by id
// update a title by id
router.put("/:id", auth, Logger("PUT /titles/"), (request, response) => {
  const id = request.params.id;

  // Önce mevcut belgeyi buluyoruz
  Title.findById(id)
    .then((title) => {
      if (!title) {
        return response.status(404).send({
          success: false,
          message: Messages.TITLE_NOT_FOUND,
        });
      }

      // deletable özelliğini kontrol ediyoruz
      if (title.deletable !== request.body.deletable) {
        return response.status(403).send({
          success: false,
          message: Messages.TITLE_DELETABLE_NOT_UPDATED,
        });
      }

      // Eğer deletable değiştirilmiyorsa güncelleme işlemi yapılıyor
      return Title.findByIdAndUpdate(id, request.body, {
        new: true, // Güncellenmiş belgeyi döndür
        useFindAndModify: false,
      });
    })
    .then((updatedTitle) => {
      recordActivity(
        request.user.id,
        RequestTypeList.TITLE_UPDATE,
        null,
        null,
        updatedTitle._id
      );

      response.send({
        success: true,
        message: Messages.TITLE_UPDATED,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.TITLE_NOT_UPDATED,
      });
    });
});

// delete a title by id
router.delete(
  "/:id",
  auth,
  Logger("DELETE /titles/"),
  async (request, response) => {
    const id = request.params.id;
    // find Title, if deleteable is false, return error
    Title.findById(id)
      .then((title) => {
        if (!title) {
          return response.status(404).send({
            success: false,
            message: Messages.TITLE_NOT_FOUND,
          });
        }
        if (!title.deletable) {
          return response.status(403).send({
            success: false,
            message: Messages.TITLE_NOT_DELETABLE,
          });
        }

        // eğer bu Title'a ait bir person varsa silme
        Person.findOne({ title: id }).then((person) => {
          if (person) {
            return response.status(403).send({
              success: false,
              message: Messages.TITLE_HAS_PERSON,
            });
          }
          let titleObj = title.toObject();
          // delete Title
          Title.findOneAndDelete({ _id: id })
            .then(() => {
              recordActivity(
                request.user.id,
                RequestTypeList.TITLE_DELETE,
                null,
                `${titleObj.name} başlıklı unvan silindi`,
                id
              );

              response.send({
                success: true,
                message: Messages.TITLE_DELETED,
              });
            })
            .catch((error) => {
              response.status(500).send({
                message: error.message || Messages.TITLE_NOT_DELETED,
              });
            });
        });
      })
      .catch((error) => {
        response.status(500).send({
          message: error.message || Messages.TITLE_NOT_DELETED,
        });
      });
  }
);

module.exports = router;
