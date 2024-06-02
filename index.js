const express = require("express");
const app = express();
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

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

const users = require("./routes/users");
app.use("/api/users", users);

const institutions = require("./routes/institutions");
app.use("/api/institutions", institutions);

const unit_types = require("./routes/unit_types");
app.use("/api/unit_types", unit_types);

const units = require("./routes/units");
app.use("/api/units", units);

const persons = require("./routes/persons");
app.use("/api/persons", persons);



mongoDbConnect();



app.listen(port, () => {
  console.log(getTimeForLog() + `Listening on port ${port}`);
});
