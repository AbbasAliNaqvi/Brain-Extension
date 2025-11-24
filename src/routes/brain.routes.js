const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const Controller = require("../controllers/brain.controller");

router.post("/process", auth, Controller.intake);

module.exports = router;