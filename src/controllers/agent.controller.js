const agentService = require('../services/agent.service');

exports.planAgentTask = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || prompt.trim().length < 3) {
            return res.status(400).json({ message: 'Prompt is required' });
        }
        const plan = await agentService.generatePlan(prompt);
        res.status(200).json(plan);
    } catch (err) {
        console.error('[Agent Plan]', err.message);
        res.status(500).json({ message: err.message || 'Agent planning failed' });
    }
};

exports.debugError = async (req, res) => {
    try {
        const { error, code } = req.body;
        if (!error) return res.status(400).json({ message: 'Error text is required' });
        
        const debugResult = await agentService.generateDebugFix(error, code);
        res.status(200).json(debugResult);
    } catch (err) {
        console.error('[Agent Debug]', err.message);
        res.status(500).json({ message: err.message || 'Debug agent failed' });
    }
};

exports.analyzeJobFit = async (req, res) => {
    try {
        const { jobDescription } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!jobDescription) return res.status(400).json({ message: 'Job description is required' });
        if (!token) return res.status(401).json({ message: 'Authentication required' });

        const fitAnalysis = await agentService.analyzeJobFit(jobDescription, token);
        res.status(200).json(fitAnalysis);
    } catch (err) {
        console.error('[Agent JobFit]', err.message);
        res.status(500).json({ message: err.message || 'Job fit analysis failed' });
    }
};