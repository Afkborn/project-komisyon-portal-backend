const express = require("express");
const app = express();
const cors = require('cors');
const bodyParser = require("body-parser");
const mongoDbConnect = require("./database/mongoDb");
const getTimeForLog = require("./common/time");
require("dotenv").config();
const port = process.env.PORT;

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(cors()); // CORS'u etkinleştirir

app.use(bodyParser.json());


const users = require("./routes/users");
app.use("/api/users", users);

const institutions = require("./routes/institutions");
app.use("/api/institutions", institutions);

const unit_types = require("./routes/unit_types");
app.use("/api/unit_types", unit_types);

const units = require("./routes/units");
app.use("/api/units", units);

const titles = require("./routes/titles");
app.use("/api/titles", titles);

const persons = require("./routes/persons");
app.use("/api/persons", persons);

const personunits = require("./routes/personunits");
app.use("/api/personunits", personunits);

const leaves = require("./routes/leaves");
app.use("/api/leaves", leaves);

const reports = require("./routes/reports");
app.use("/api/reports", reports);


const activities = require("./routes/activities");
app.use("/api/activities", activities);

mongoDbConnect();


const checkConstantTitle = require("./actions/DatabaseActions").checkConstantTitle;
checkConstantTitle();



app.listen(port, () => {
  console.log(getTimeForLog() + `Listening on port ${port}`);
});
