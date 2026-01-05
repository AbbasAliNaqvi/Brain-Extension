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

app.use("/brain", require("./routes/brain.routes"));

app.use("/memory", require("./routes/memory.routes"));

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        message: "Brain Extension is Running Perfectly!",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

module.exports = app;