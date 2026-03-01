const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agent.controller");

router.post("/plan", agentController.planAgentTask);
router.post("/debug", agentController.debugError);
router.post("/cluster-tabs", agentController.clusterTabs);

module.exports = router;