const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const requireVerified = require("../middleware/requireVerified.js");

const GController = require("../controllers/graph.controller");
const Controller = require("../controllers/brain.controller");

const StreamController = require("../controllers/stream.controller");
const StatsController = require("../controllers/stats.controller");

router.post("/process", auth, requireVerified, Controller.processSync);

router.post("/intake", auth, requireVerified, Controller.intake);

router.post("/ask", auth, requireVerified, Controller.createBrainRequest);
router.get("/result/:id", auth, requireVerified, Controller.getResult);
router.get("/dreams", auth, requireVerified, Controller.getDreamJournal);
router.get("/graph", auth, requireVerified, GController.getNeuroGraph);
router.post("/coAsk", auth, requireVerified, Controller.coAsk);
router.post("/stream", auth, StreamController.streamCoAsk);
router.get("/stats", auth, StatsController.getStats);

router.post("/snap", auth, requireVerified, Controller.vision);
router.post("/vision", auth, requireVerified, Controller.vision); 

router.post("/translate", auth, Controller.translate);

module.exports = router;