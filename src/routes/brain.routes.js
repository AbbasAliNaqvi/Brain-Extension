const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const GController = require("../controllers/graph.controller");
const Controller = require("../controllers/brain.controller");

router.post("/process", auth, Controller.intake);

router.post("/ask", auth, Controller.createBrainRequest);

router.get("/result/:id", auth, Controller.getResult);

router.get("/dreams", auth, Controller.getDreamJournal);

router.get("/graph", auth, GController.getNeuroGraph);

module.exports = router;