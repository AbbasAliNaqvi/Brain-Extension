const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agent.controller");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/plan", agentController.planAgentTask);

router.post("/debug", agentController.debugError);

router.post("/cluster-tabs", agentController.clusterTabs);

router.post("/remote-dispatch", authMiddleware, agentController.remoteDispatch);

module.exports = router;