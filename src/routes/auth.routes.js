const router = require("express").Router();

const controllers = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");

const validate = require("../middleware/validate");
const schemas = require("../validations/auth.validation");

//Public Routes
router.post("/signup", validate(schemas.signup), controllers.signup);
router.post("/login", validate(schemas.login), controllers.login);
router.post("/refresh", validate(schemas.refresh), controllers.refresh);
router.post("/logout", validate(schemas.refresh), controllers.logout);

//Email verification
router.post("/verify/request", authMiddleware, controllers.sendVerifyEmail);
router.post("/verify/confirm", controllers.verifyEmail);

//Password reset
router.post("/forgot-password", controllers.forgotPassword);
router.patch("/reset-password/:token", controllers.resetPassword);
router.get("/reset-password-bridge/:token", controllers.resetPasswordBridge);

//Remote Access
router.post("/remote-access/request", controllers.requestRemoteAccess);
router.post("/remote-access/verify", controllers.verifyRemoteAccess);

//Protected Routes
router.get("/me", authMiddleware, controllers.me);

module.exports = router;