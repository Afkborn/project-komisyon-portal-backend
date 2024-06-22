const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const Title = require("../model/Title");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

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
  });

  title
    .save()
    .then((data) => {
      response.send(data);
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.TITLE_NOT_SAVED,
      });
    });
});

// update a title by id
router.put("/:id", auth, Logger("PUT /titles/"), (request, response) => {
  const id = request.params.id;

  Title.findByIdAndUpdate(id, request.body, { useFindAndModify: false })
    .then((title) => {
      if (!title) {
        return response.status(404).send({
          success: false,
          message: Messages.TITLE_NOT_FOUND,
        });
      }
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
router.delete("/:id", auth, Logger("DELETE /titles/"), (request, response) => {
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
      Title.findOneAndDelete({ _id: id })
        .then(() => {
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
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.TITLE_NOT_DELETED,
      });
    });
});

module.exports = router;
