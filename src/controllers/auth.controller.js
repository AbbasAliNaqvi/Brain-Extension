const crypto = require("crypto");

const authservice = require("../services/auth.service");
const User = require("../models/User");
const sendEmail = require("../utils/emailHtml");

// SIGNUP
exports.signup = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            avatarUrl
        } = req.body;

        const device = req.headers["user-agent"] || "unknown";
        const ip = req.ip || req.connection.remoteAddress || "unknown";

        const result = await authservice.signup({
            name,
            email,
            password,
            avatarUrl,
            device,
            ip
        });
    
    return res.status(201).json({
        status: "OK",
        ...result 
    });
    } catch (err) {
        return res.status(err.status || 500).json({
            status: "ERROR",
            message: err.message || "Internal Server Error",
        });
    }
};

// LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const device = req.headers["user-agent"] || "unknown";
        const ip = req.ip || req.connection.remoteAddress || "unknown";

        const result = await authservice.login({
            email,
            password,
            device,
            ip
        });

        return res.status(200).json({
            status: "OK",
            ...result 
        });
    } catch (err) {
        return res.status(err.status || 500).json({
            status: "ERROR",
            message: err.message || "Internal Server Error",
        });
    }
};

// REFRESH TOKEN
exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        const result = await authservice.refresh({
            refreshToken
        });
        
        return res.json({
            status: "OK",
            ...result
        })
    } catch (err) {
        return res.status(err.status || 500).json({
            status: "ERROR",
            message: err.message || "Internal Server Error",
        });
    }
};

// LOGOUT
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        await authservice.logout({
            refreshToken
        });

        return res.json({
            status: "OK",
            message: "Logged out successfully"
        });
    } catch (err){
        return res.status(err.status || 500).json({
            status: "ERROR",
            message: err.message || "Internal Server Error",
        });
    }
};

// GET /ME
exports.me = async (req, res) => {
    return res.json({
        status: "OK",
        user: req.user,
    });
};

// EMAIL VERIFICATION REQUEST (OTP)
exports.sendVerifyEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.emailVerificationToken = otp;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    const fs = require("fs");
    const path = require("path");

    const templatePath = path.join(__dirname, "../templates/verifyEmail.html");
    let html = fs.readFileSync(templatePath, "utf8");

    html = html.replace(/{{CODE}}/g, otp);

    const sendHtmlEmail = require("../utils/emailHtml");
    await sendHtmlEmail(
      user.email,
      "Your Brain-Extension Verification Code",
      html
    );

    res.json({
      status: "OK",
      message: "Verification code sent",
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      message: err.message,
    });
  }
};

// EMAIL VERIFICATION DONE
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { 
                $gt: Date.now()                
            }
        });

        if (!user)
            return res.status(400).json({
                status: "ERROR",
                message: "Invalid or expired token"
            });

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        await user.save();

        return res.json({
            status: "OK",
            message: "Email verified successfully"
        });
    } catch (err) {
        return res.status(err.status || 500).json({
            status: "ERROR",
            message: err.message || "Internal Server Error",
        });
    }
};