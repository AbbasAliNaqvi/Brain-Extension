const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "1555555m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "70d";

function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { 
        expiresIn: ACCESS_EXPIRES 
    });
}

function verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}

function generateRefreshToken(){
    return crypto.randomBytes(40).toString('hex');
}

module.exports ={
    generateAccessToken,
    verifyAccessToken,
    generateRefreshToken,
    ACCESS_EXPIRES,
    REFRESH_EXPIRES,
};