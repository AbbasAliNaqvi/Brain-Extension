const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const brainShield = require('../middleware/brainShield');

router.use(brainShield); 

router.post('/plan', agentController.planAgentTask);
router.post('/debug', agentController.debugError);
router.post('/jobfit', agentController.analyzeJobFit);

module.exports = router;