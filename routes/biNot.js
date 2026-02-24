const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

const User = require("../model/User");

const BiNotDerkenar = require("../model/BiNotDerkenar");
const BiNotNotification = require("../model/BiNotNotification");

const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

function getUserId(req) {
	return req?.user?.id || req?.user?._id;
}

async function getUserUnitIds(userId) {
	const user = await User.findById(userId).populate("person");
	if (!user) {
		return { user: null, unitIds: [] };
	}

	const unitIds = [];
	const person = user.person;

	if (person) {
		if (person.birimID) unitIds.push(person.birimID);
		if (person.ikinciBirimID) unitIds.push(person.ikinciBirimID);
		if (person.temporaryBirimID) unitIds.push(person.temporaryBirimID);
	}

	const unique = [...new Set(unitIds.filter(Boolean).map((id) => id.toString()))];
	return { user, unitIds: unique };
}

// POST /api/biNot/add
router.post("/add", auth, Logger("POST /biNot/add"), async (req, res) => {
	const userId = getUserId(req);
	if (!userId) {
		return res.status(401).send({
			success: false,
			message: Messages.TOKEN_NOT_FOUND,
		});
	}

	try {
		const { title, content, fileNumber } = req.body;
		const isPrivate = Boolean(req.body.isPrivate);
		const hasReminder = Boolean(req.body.hasReminder);
		const reminderDate = req.body.reminderDate;
		const priority = req.body.priority;

		if (!title) {
			return res.status(400).send({
				success: false,
				message: `title ${Messages.REQUIRED_FIELD}`,
			});
		}

		if (hasReminder && !reminderDate) {
			return res.status(400).send({
				success: false,
				message: `reminderDate ${Messages.REQUIRED_FIELD}`,
			});
		}

		// birimID zorunlu (model required). Body'de yoksa kullanıcı person'ından türet.
		let birimID = req.body.birimID;
		if (!birimID) {
			const { user } = await getUserUnitIds(userId);
			birimID = user?.person?.temporaryBirimID || user?.person?.birimID || null;
		}
		if (!birimID) {
			return res.status(400).send({
				success: false,
				message: `birimID ${Messages.REQUIRED_FIELD}`,
			});
		}

		// reminderTarget: private notlarda zorunlu olarak SELF
		const reminderTarget = isPrivate
			? "SELF"
			: req.body.reminderTarget || "SELF";

		const derkenar = new BiNotDerkenar({
			title,
			content,
			fileNumber,
			creator: userId,
			birimID,
			isPrivate,
			hasReminder,
			reminderDate: hasReminder ? new Date(reminderDate) : undefined,
			reminderTarget,
			priority,
		});

		const saved = await derkenar.save();

		// İleride job/cron ile üretilecek bildirimler için model hazır; şimdilik kayıt oluşturma opsiyonel.
		// hasReminder true ise, creator'a bir kayıt düşelim.
		if (hasReminder) {
			await BiNotNotification.create({
				derkenarID: saved._id,
				recipient: userId,
				message: `${saved.title} için anımsatıcı oluşturuldu`,
				birimID: saved.birimID,
			});
		}

		await recordActivity(
			userId,
			RequestTypeList.BINOT_CREATE_NOTE,
			null,
			`BİNOT not eklendi: ${saved.title}`,
			null,
			saved.birimID,
		);

		return res.status(201).send({
			success: true,
			data: saved,
		});
	} catch (error) {
		return res.status(500).send({
			success: false,
			message: error.message || Messages.SERVER_ERROR,
		});
	}
});

// GET /api/biNot/list
router.get("/list", auth, Logger("GET /biNot/list"), async (req, res) => {
	const userId = getUserId(req);
    let { isPrivate, birimId } = req.query;
    isPrivate = isPrivate === "true" ? true : isPrivate === "false" ? false : null;

	if (!userId) {
		return res.status(401).send({
			success: false,
			message: Messages.TOKEN_NOT_FOUND,
		});
	}

	try {
		const { user, unitIds } = await getUserUnitIds(userId);
		if (!user) {
			return res.status(404).send({
				success: false,
				message: Messages.USER_NOT_FOUND,
			});
		}

		const orFilters = [];

		// isPrivate öncelikli kontrol (birimId göz ardı edilir)
		if (isPrivate === true) {
			// Sadece şahsi notlar
			orFilters.push({
				creator: userId,
				isPrivate: true,
			});
		} else if (isPrivate === false) {
			// Sadece birim notları (tüm birimler)
			if (unitIds.length > 0) {
				orFilters.push({
					birimID: { $in: unitIds },
					isPrivate: false,
				});
			}
		} else if (birimId) {
			// Sadece belirtilen birime ait notlar (isPrivate belirtilmemiş)
			orFilters.push({
				birimID: birimId,
				isPrivate: false,
			});
		} else {
			// Hiçbir parametre yoksa her ikisini de getir
			if (unitIds.length > 0) {
				orFilters.push({
					birimID: { $in: unitIds },
					isPrivate: false,
				});
			}
			orFilters.push({
				creator: userId,
				isPrivate: true,
			});
		}

		const list = await BiNotDerkenar.find({ $or: orFilters })
			.populate({
				path: "creator",
				select: "username name surname",
				populate: {
					path: "person",
					select: "sicil"
				}
			})
			.populate("birimID", "name")
			.sort({ createdAt: -1 })
			.lean();

		await recordActivity(
			userId,
			RequestTypeList.BINOT_LIST_NOTE,
			null,
			"BİNOT not listesi görüntülendi",
		);

		return res.status(200).send({
			success: true,
			length: list.length,
			list,
		});
	} catch (error) {
		return res.status(500).send({
			success: false,
			message: error.message || Messages.SERVER_ERROR,
		});
	}
});

// PUT /api/biNot/complete/:id
router.put(
	"/complete/:id",
	auth,
	Logger("PUT /biNot/complete/:id"),
	async (req, res) => {
		const userId = getUserId(req);
		if (!userId) {
			return res.status(401).send({
				success: false,
				message: Messages.TOKEN_NOT_FOUND,
			});
		}

		try {
			const note = await BiNotDerkenar.findById(req.params.id);
			if (!note) {
				return res.status(404).send({
					success: false,
					message: Messages.BINOT_NOTE_NOT_FOUND,
				});
			}

			// Private notu sadece creator değiştirebilir.
			if (note.isPrivate && note.creator.toString() !== userId.toString()) {
				return res.status(403).send({
					success: false,
					message: Messages.USER_NOT_AUTHORIZED,
				});
			}

			// Birim notu: kullanıcının birimlerinden birine ait olmalı
			if (!note.isPrivate) {
				const { unitIds } = await getUserUnitIds(userId);
				if (!unitIds.includes(note.birimID.toString())) {
					return res.status(403).send({
						success: false,
						message: Messages.USER_NOT_AUTHORIZED,
					});
				}
			}

			note.isCompleted = !note.isCompleted;
			const saved = await note.save();

			await recordActivity(
				userId,
				RequestTypeList.BINOT_COMPLETE_NOTE,
				null,
				`BİNOT tamamlandı durumu değişti: ${saved.title} (${saved.isCompleted})`,
				null,
				saved.birimID,
			);

			return res.status(200).send({
				success: true,
				data: saved,
			});
		} catch (error) {
			return res.status(500).send({
				success: false,
				message: error.message || Messages.SERVER_ERROR,
			});
		}
	},
);

// DELETE /api/biNot/:id
router.delete("/:id", auth, Logger("DELETE /biNot/:id"), async (req, res) => {
	const userId = getUserId(req);
	if (!userId) {
		return res.status(401).send({
			success: false,
			message: Messages.TOKEN_NOT_FOUND,
		});
	}

	try {
		const note = await BiNotDerkenar.findById(req.params.id);
		if (!note) {
			return res.status(404).send({
				success: false,
				message: Messages.BINOT_NOTE_NOT_FOUND,
			});
		}

		if (note.creator.toString() !== userId.toString()) {
			return res.status(403).send({
				success: false,
				message: Messages.USER_NOT_AUTHORIZED,
			});
		}

		await BiNotNotification.deleteMany({ derkenarID: note._id });
		await BiNotDerkenar.deleteOne({ _id: note._id });

		await recordActivity(
			userId,
			RequestTypeList.BINOT_DELETE_NOTE,
			null,
			`BİNOT not silindi: ${note.title}`,
			null,
			note.birimID,
		);

		return res.status(200).send({
			success: true,
			message: Messages.BINOT_NOTE_DELETED,
		});
	} catch (error) {
		return res.status(500).send({
			success: false,
			message: error.message || Messages.SERVER_ERROR,
		});
	}
});

module.exports = router;
