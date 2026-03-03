const agentService = require("../services/agent.service");
const socketService = require("../services/socket.service");

exports.planAgentTask = async (req, res) => {
  try {
    const prompt = req.body.prompt || req.body.command;
    if (!prompt || prompt.trim().length < 3) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Prompt is required" });
    }

    const plan = await agentService.generatePlan(prompt);
    res.status(200).json({ goal: plan.goal || prompt, actions: plan.actions });
  } catch (err) {
    res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.debugError = async (req, res) => {
  try {
    const { error, code } = req.body;
    if (!error)
      return res
        .status(400)
        .json({ status: "ERROR", message: "Error text required" });

    const debugResult = await agentService.generateDebugFix(error, code);
    res.status(200).json(debugResult);
  } catch (err) {
    res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.clusterTabs = async (req, res) => {
  try {
    const { tabs } = req.body;
    if (!tabs || !tabs.length) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "No tabs provided" });
    }

    const clusters = await agentService.clusterTabs(tabs);
    res.status(200).json({ status: "OK", clusters });
  } catch (err) {
    res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.remoteDispatch = async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user._id;
    if (!prompt) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Prompt is required." });
    }

    const plan = await agentService.generatePlan(prompt);

    if (!plan.actions || plan.actions.length === 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "AI could not generate a valid action plan.",
      });
    }

    const taskPayload = {
      goal: plan.goal || prompt,
      actions: plan.actions,
      id: Date.now(),
    };

    const dispatchResult = socketService.dispatchFromRest(userId, taskPayload);

    return res.status(200).json({
      status: "OK",
      executionStatus: dispatchResult.status,
      message: dispatchResult.message,
      plan: taskPayload,
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Failed to dispatch remote task",
    });
  }
};

exports.stopRemoteAgent = async (req, res) => {
  try {
    const userId = req.user._id;
    const stopResult = socketService.stopFromRest(userId);
    return res.status(200).json({ status: "OK", message: stopResult.message });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "ERROR", message: "Failed to trigger kill switch." });
  }
};