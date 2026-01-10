const express = require("express");
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");

const brainShield = require("./middleware/brainShield");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        message: "Brain Extension is Running Perfectly!",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.use((req, res, next) => {
    if (req.path.includes("/reset-password-bridge")){
        return next();
    }
    brainShield(req, res, next);
});

app.use("/auth", require("./routes/auth.routes"));

app.use("/files", require("./routes/file.routes"));

app.use("/brain", require("./routes/brain.routes"));

app.use("/memory", require("./routes/memory.routes"));

module.exports = app;