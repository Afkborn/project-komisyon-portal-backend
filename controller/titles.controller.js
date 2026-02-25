const Messages = require("../constants/Messages");
const Title = require("../model/Title");
const { Person } = require("../model/Person");
const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

// GET /titles
// Tüm unvanları listele
exports.getAllTitles = async (request, response) => {
  try {
    const titles = await Title.find();

    response.send({
      success: true,
      titleList: titles,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.TITLE_NOT_FOUND,
    });
  }
};

// POST /titles
// Yeni unvan ekle
exports.createTitle = async (request, response) => {
  try {
    const title = new Title({
      name: request.body.name,
      kind: request.body.kind,
      deletable: request.body.deletable,
      oncelikSirasi: request.body.oncelikSirasi,
    });

    const savedTitle = await title.save();

    recordActivity(
      request.user.id,
      RequestTypeList.TITLE_CREATE,
      null,
      null,
      savedTitle._id
    );

    response.send(savedTitle);
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.TITLE_NOT_SAVED,
    });
  }
};

// PUT /titles/:id
// Unvanı güncelle
exports.updateTitle = async (request, response) => {
  try {
    const id = request.params.id;

    // Mevcut belgeyi bul
    const title = await Title.findById(id);
    if (!title) {
      return response.status(404).send({
        success: false,
        message: Messages.TITLE_NOT_FOUND,
      });
    }

    // deletable özelliğini kontrol et
    if (title.deletable !== request.body.deletable) {
      return response.status(403).send({
        success: false,
        message: Messages.TITLE_DELETABLE_NOT_UPDATED,
      });
    }

    // Güncelle
    const updatedTitle = await Title.findByIdAndUpdate(id, request.body, {
      new: true,
      useFindAndModify: false,
    });

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
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.TITLE_NOT_UPDATED,
    });
  }
};

// DELETE /titles/:id
// Unvanı sil
exports.deleteTitle = async (request, response) => {
  try {
    const id = request.params.id;

    // Unvanı bul
    const title = await Title.findById(id);
    if (!title) {
      return response.status(404).send({
        success: false,
        message: Messages.TITLE_NOT_FOUND,
      });
    }

    // Silinebilir mi kontrolü
    if (!title.deletable) {
      return response.status(403).send({
        success: false,
        message: Messages.TITLE_NOT_DELETABLE,
      });
    }

    // Bu unvana ait bir personel var mı kontrolü
    const person = await Person.findOne({ title: id });
    if (person) {
      return response.status(403).send({
        success: false,
        message: Messages.TITLE_HAS_PERSON,
      });
    }

    const titleObj = title.toObject();

    // Sil
    await Title.findOneAndDelete({ _id: id });

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
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.TITLE_NOT_DELETED,
    });
  }
};
