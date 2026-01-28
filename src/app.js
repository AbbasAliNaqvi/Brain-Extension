const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const swaggerUi = require('swagger-ui-express');

const xss = require('xss-clean');

require("dotenv").config();

const brainShield = require("./middleware/brainShield");
const rateLimiter = require("./middleware/rateLimiter");
const swaggerFile = require('./swagger-output.json');

const app = express();

swaggerFile.host = process.env.HOST || undefined; 
swaggerFile.schemes = process.env.SCHEMES ? process.env.SCHEMES.split(',') : undefined;

app.use(helmet());
app.use(compression());
app.use(rateLimiter);

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(morgan("dev"));

app.use(xss());

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
    if (req.path.startsWith("/docs")){
        return next();
    }
    brainShield(req, res, next);
});

app.use("/auth", require("./routes/auth.routes"));

app.use("/files", require("./routes/file.routes"));

app.use("/brain", require("./routes/brain.routes"));

app.use("/memory", require("./routes/memory.routes"));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

module.exports = app;