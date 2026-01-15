const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");

require("dotenv").config();

const brainShield = require("./middleware/brainShield");
const rateLimiter = require("./middleware/rateLimiter");

const app = express();

app.use(helmet());
app.use(compression());

app.use(rateLimiter);

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
    if (req.path.startsWith("/auth")){
        return next();
    }
    brainShield(req, res, next);
});

app.use("/auth", require("./routes/auth.routes"));

app.use("/files", require("./routes/file.routes"));

app.use("/brain", require("./routes/brain.routes"));

app.use("/memory", require("./routes/memory.routes"));

module.exports = app;