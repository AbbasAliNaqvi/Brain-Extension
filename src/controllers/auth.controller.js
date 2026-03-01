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

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
    try {
        const {
            email
        } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({
                status: "OK",
                message: "If Email exists, reset instructions sent"
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        user.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        const baseUrl = process.env.RESET_PASSWORD_URL;
        const resetUrl = `${baseUrl}/${resetToken}`;

        const fs = require("fs");
        const path = require("path");
        const templatePath = path.join(__dirname, "../templates/resetPassword.html");

        let html = fs.readFileSync(templatePath, "utf8");
        html = html.replace(/\{\{\s*RESET_LINK\s*\}\}/g, resetUrl);

        const sendHtmlEmail = require("../utils/emailHtml");
        await sendHtmlEmail(
            user.email,
            "Secure Access Recovery Instructions [Brain-Extension]",
            html
        );

        res.status(200).json({
            status: "OK",
            message: "Reset Link Sent to Email!"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
    try {
        const {
            token
        } = req.params;
        const {
            password
        } = req.body;

        const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: {
                $gt: Date.now()
            }
        });

        if (!user) {
            return res.status(400).json({
                status: "ERROR",
                message: "Token is invalid or has expired"
            });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        if(!user.emailVerified) user.emailVerified = true;

        await user.save();

        res.status(200).json({
            status: "OK",
            message: "Password has been reset successfully"
        });

    } catch (err) {
        res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};

exports.resetPasswordBridge = (req, res) => {
    const { token } = req.params;

    const appLink = `brainextension://auth/reset-password/${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redirecting...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
                background-color: #000000; 
                color: #ffffff; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                height: 100vh;
                margin: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .loader {
                border: 3px solid #333;
                border-top: 3px solid #fff;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin-bottom: 24px;
            }
            p { font-size: 16px; color: #e5e5e5; margin: 0; }
            a { color: #666; font-size: 13px; text-decoration: none; margin-top: 32px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <p>Opening Brain Extension...</p>
          <a href="${appLink}">Click here if not redirected</a>
          <script>
            setTimeout(function() {
                window.location.href = "${appLink}";
            }, 50);
          </script>
        </body>
      </html>
    `;

    res.send(html);
};

const otpStore = new Map();

exports.requestRemoteAccess = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ status: "ERROR", message: "Email is required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ status: "ERROR", message: "User not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        otpStore.set(email, {
            code: otp,
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        const fs = require("fs");
        const path = require("path");
        const templatePath = path.join(__dirname, "../templates/remoteAccess.html");
        
        let html = fs.readFileSync(templatePath, "utf8");
        html = html.replace(/{{CODE}}/g, otp);

        await sendEmail(
            user.email,
            "Remote Access Code - Brain Extension",
            html
        );

        res.status(200).json({ status: "OK", message: "OTP sent successfully" });
    } catch (error) {
        console.error("OTP Error:", error);
        res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
};

exports.verifyRemoteAccess = async (req, res) => {
    try {
        const { email, code } = req.body;
        
        const record = otpStore.get(email);
        if (!record) {
            return res.status(400).json({ status: "ERROR", message: "OTP expired or not requested" });
        }

        if (Date.now() > record.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ status: "ERROR", message: "OTP has expired" });
        }

        if (record.code !== code) {
            return res.status(401).json({ status: "ERROR", message: "Invalid OTP code" });
        }

        otpStore.delete(email);

        const user = await User.findOne({ email });
        const jwt = require("jsonwebtoken");
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.status(200).json({
            status: "OK",
            message: "Remote access granted",
            token: token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        res.status(500).json({ status: "ERROR", message: "Verification failed" });
    }
};