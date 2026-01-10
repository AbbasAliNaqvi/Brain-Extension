const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  logger: true, 
  debug: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = async function sendHtmlEmail(to, subject, html) {
  try {
    console.log("Attempting to send email to:", to); 
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log("Email sent successfully. Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("FATAL EMAIL ERROR:", error);
    throw error;
  }
};