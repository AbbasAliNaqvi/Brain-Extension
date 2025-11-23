const express = require("express");
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/auth", require("./routes/auth.routes"));

app.use("/files", require("./routes/file.routes"));

app.get("/", (req, res) => {
  res.send("Brain Extension is Running Perfectly!");
});

module.exports = app;