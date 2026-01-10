const router = require("express").Router();

const controllers = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");

//Public Routes
router.post("/signup", controllers.signup);
router.post("/login", controllers.login);
router.post("/refresh", controllers.refresh);
router.post("/logout", controllers.logout);

//Email verification
router.post("/verify/request", authMiddleware, controllers.sendVerifyEmail);
router.post("/verify/confirm", controllers.verifyEmail);

//Password reset
router.post("/forgot-password", controllers.forgotPassword);
router.patch("/reset-password/:token", controllers.resetPassword);
router.get("/reset-password-bridge/:token", controllers.resetPasswordBridge);

//Protected Routes
router.get("/me", authMiddleware, controllers.me);

module.exports = router;