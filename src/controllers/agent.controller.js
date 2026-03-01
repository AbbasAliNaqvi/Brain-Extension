const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AGENT_SYSTEM_PROMPT = `You are a browser automation planner. Given a natural language command, output ONLY a valid JSON object.
CRITICAL URL BYPASS RULES:
- Google search: navigate to "https://www.google.com/search?q=X"
- Amazon search: navigate to "https://www.amazon.in/s?k=X"
- YouTube search: navigate to "https://www.youtube.com/results?search_query=X"
- GitHub search: navigate to "https://github.com/search?q=X"
- Gmail compose: navigate to "https://mail.google.com/mail/?view=cm&fs=1"
- LinkedIn jobs: navigate to "https://www.linkedin.com/jobs/search/?keywords=X&location=City"
- Twitter search: navigate to "https://twitter.com/search?q=X"
- MDN search: navigate to "https://developer.mozilla.org/en-US/search?q=X"
SELECTOR RULES:
- Prefer aria-label or data-testid
- For inputs, use semantic text
- Add wait 1500ms after navigate
- Add wait 800ms after click
Respond ONLY with: { "goal": "desc", "actions": [{"type": "navigate", "url": "..."}] }`;

const DEBUG_SYSTEM_PROMPT = `You are an expert debugging assistant. Analyze the error and provide:
1. **Root Cause**: Fundamentally causing this error
2. **Exact Fix**: Working code
3. **Why This Works**: Brief technical explanation
4. **Prevention**: Avoid in future
Format with markdown.`;

function _extractSearchQuery(errorText) {
    return errorText.replace(/at\s+[\w.<>]+\s+\(.+?\)/g, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function _classifyError(errorText) {
    const e = errorText.toLowerCase();
    if (e.includes("typeerror")) return "TypeError";
    if (e.includes("syntaxerror")) return "SyntaxError";
    if (e.includes("referenceerror")) return "ReferenceError";
    return "RuntimeError";
}

function _stripHtml(html) {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "").trim().slice(0, 800);
}

exports.planAgentTask = async (req, res) => {
    try {
        const prompt = req.body.prompt || req.body.command;
        if (!prompt || prompt.trim().length < 3) return res.status(400).json({ status: "ERROR" });
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            max_tokens: 1200,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: AGENT_SYSTEM_PROMPT }, { role: "user", content: `Command: "${prompt}"` }]
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content);
        parsed.actions = (parsed.actions || []).filter(a => a.type).slice(0, 20);
        res.status(200).json({ goal: parsed.goal || prompt, actions: parsed.actions });
    } catch (err) {
        res.status(500).json({ status: "ERROR", message: err.message });
    }
};

exports.debugError = async (req, res) => {
    try {
        const { error, code } = req.body;
        if (!error) return res.status(400).json({ status: "ERROR" });
        const errorType = _classifyError(error);
        const searchQuery = _extractSearchQuery(error);
        let sources = [];
        try {
            const STACK_KEY = process.env.STACK_EXCHANGE_KEY || "";
            const soUrl = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(searchQuery)}&accepted=True&site=stackoverflow&filter=withbody&pagesize=4&key=${STACK_KEY}`;
            const soRes = await fetch(soUrl);
            const soData = await soRes.json();
            sources = (soData.items || []).slice(0, 4).map(item => ({ title: item.title, link: item.link, score: item.score, body: _stripHtml(item.body), tags: item.tags || [] }));
        } catch (e) {}
        const contextParts = [`Error:\n${error}`, code ? `\nCode Context:\n${code.slice(0, 800)}` : "", sources.length ? `\nTop StackOverflow Results:\n${sources.map((s, i) => `${i + 1}. "${s.title}" (score: ${s.score})\n${s.body.slice(0, 400)}`).join("\n\n")}` : ""].filter(Boolean).join("\n");
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 1200,
            messages: [{ role: "system", content: DEBUG_SYSTEM_PROMPT }, { role: "user", content: contextParts }]
        });
        res.status(200).json({ errorType, sources, fix: completion.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ status: "ERROR", message: err.message });
    }
};

exports.clusterTabs = async (req, res) => {
    try {
        const { tabs } = req.body;
        if (!tabs || !tabs.length) return res.status(400).json({ status: "ERROR", message: "No tabs provided" });
        
        const prompt = `You are ContextOS, an advanced cognitive orchestrator. Analyze this list of browser tabs. 
        Group EVERY SINGLE TAB into semantic clusters based on the user's deep intent and context. 
        
        CRITICAL RULES:
        1. YOU MUST INCLUDE EVERY SINGLE TAB ID from the input. Do not drop, skip, or ignore ANY tabs. The total number of tabIds in your output must exactly match the input. Create a "Miscellaneous" or "Casual Browsing" cluster for outliers if necessary.
        2. Do NOT use emojis under any circumstances.
        3. Make the "clusterName" highly descriptive, context-rich, and action-oriented. Use prefixes to define the mental mode (e.g., "Project: Hack2Skill Backend", "Research: System Architecture", "Debugging: React State", "Communication & Admin").

        Return ONLY a JSON object with a single key "clusters" containing an array of objects.
        Each object MUST have:
        "clusterName": string (The highly descriptive, professional intent-based title),
        "color": string (strictly one of these exact strings: "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"),
        "tabIds": array of numbers (the exact tab ids belonging to this group).

        Tabs data: ${JSON.stringify(tabs)}`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, 
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
        });

        let raw = completion.choices[0].message.content.trim();
        
        if (raw.startsWith("```")) {
            raw = raw.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
        }

        const parsed = JSON.parse(raw);
        res.status(200).json({ status: "OK", clusters: parsed.clusters || [] });
    } catch (err) {
        console.error("Cluster Error:", err);
        res.status(500).json({ status: "ERROR", message: err.message });
    }
};