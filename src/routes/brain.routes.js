const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const GController = require("../controllers/graph.controller");
const Controller = require("../controllers/brain.controller");
const requireVerified = require("../middleware/requireVerified.js");

router.post("/process", auth, requireVerified, Controller.intake);

router.post("/ask", auth, requireVerified, Controller.createBrainRequest);

router.get("/result/:id", auth, requireVerified, Controller.getResult);

router.get("/dreams", auth, requireVerified, Controller.getDreamJournal);

router.get("/graph", auth, requireVerified, GController.getNeuroGraph);

router.post('/coAsk', auth, requireVerified, Controller.coAsk);

module.exports = router;