const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AGENT_SYSTEM_PROMPT = `You are a browser automation AI agent. Convert the user's natural language instruction into a precise JSON workflow.

Return ONLY valid JSON — no markdown, no explanation — in exactly this schema:
{
  "goal": "one-line plain English summary of the task",
  "actions": [
    { "type": "navigate", "url": "https://exact-url.com" },
    { "type": "wait", "ms": 1500 },
    { "type": "type", "selector": "selector_or_xpath", "value": "text to type", "pressEnter": false },
    { "type": "click", "selector": "selector_or_xpath" },
    { "type": "scroll", "y": 400 },
    { "type": "read", "selector": "main, article, .results" }
  ]
}

SELECTOR RULES:
1. For search inputs: prefer input[name="q"], input[type="search"], textarea[name="q"]
2. For buttons: use XPath //button[contains(text(),'Search')] or //button[@type='submit']
3. For links: use XPath //a[contains(text(),'Text')] or [role="link"]
4. ALWAYS add a "wait" of 1200ms after "navigate" actions
5. For Google search: navigate to https://www.google.com/search?q=your+query directly
6. For GitHub search: navigate to https://github.com/search?q=your+query&type=repositories

Only return JSON. No other text.`;

const _extractSearchQuery = (error) => error.split('\n')[0].replace(/at\s+\w+[\w.]*\s*\(.*?\)/g, '').substring(0, 120);
const _classifyError = (error) => {
    const l = error.toLowerCase();
    if (l.includes('typeerror')) return 'TypeError';
    if (l.includes('syntaxerror')) return 'SyntaxError';
    if (l.includes('referenceerror')) return 'ReferenceError';
    return 'Error';
};
const _stripHtml = (html) => html.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => `\n\`\`\`\n${code}\n\`\`\`\n`).replace(/<[^>]+>/g, ' ').trim();

exports.generatePlan = async (prompt) => {
    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: AGENT_SYSTEM_PROMPT },
            { role: 'user', content: prompt.trim() },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty response from GROQ');

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.actions)) throw new Error('Invalid plan structure from AI');
    
    parsed.actions = parsed.actions.filter(a => a.type && typeof a.type === 'string').slice(0, 20);
    return parsed;
};

exports.generateDebugFix = async (errorText, code) => {
    const cleanError = errorText.trim().substring(0, 500);
    const searchQuery = _extractSearchQuery(cleanError);
    const errorType = _classifyError(cleanError);

    let sources = [];
    try {
        const STACK_KEY = process.env.STACK_EXCHANGE_KEY || '';
        const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(searchQuery)}&accepted=True&answers=1&site=stackoverflow&filter=withbody&pagesize=5&key=${STACK_KEY}`;
        
        const soRes = await fetch(url);
        const soData = await soRes.json();
        
        sources = (soData.items || []).slice(0, 4).map(item => ({
            title: item.title,
            link: item.link,
            score: item.score,
            body: _stripHtml(item.body || '').substring(0, 300),
            tags: item.tags?.slice(0, 4) || [],
        }));
    } catch (e) { 
        console.warn("StackOverflow fetch failed:", e.message); 
    }

    const contextParts = [
        `Error: ${cleanError}`,
        code ? `\nCode context:\n\`\`\`\n${code.substring(0, 800)}\n\`\`\`` : '',
        sources.length ? `\nTop StackOverflow answers:\n${sources.map((s, i) => `${i + 1}. ${s.title}\n${s.body}`).join('\n\n')}` : '',
    ].filter(Boolean).join('\n');

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: 'You are an expert debugging assistant. Format response with: 1) Root cause, 2) Exact fix with code, 3) Prevention tip.' },
            { role: 'user', content: contextParts },
        ],
        temperature: 0.1,
        max_tokens: 800,
    });

    return { errorType, sources, fix: completion.choices[0]?.message?.content || 'Unable to generate fix.' };
};

exports.analyzeJobFit = async (jobDescription, token) => {
    let userContext = 'No user profile found. Provide generic assessment.';
    try {
        const HOST = process.env.HOST || `localhost:${process.env.PORT || 5000}`;
        const PROTOCOL = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        
        const memRes = await fetch(`${PROTOCOL}://${HOST}/memory/search?query=skills experience expertise&limit=20`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const memData = await memRes.json();
        if (memData.memories?.length) {
            userContext = memData.memories.map(m => m.content).join('\n').substring(0, 2000);
        }
    } catch (e) { 
        console.warn("Memory context fetch failed:", e.message); 
    }

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: `Analyze job fit and return ONLY JSON:\n{"role": "Title", "company": "Name", "matchScore": 80, "matchedSkills": [], "missingSkills": [], "actionPlan": []}` },
            { role: 'user', content: `JOB DESCRIPTION:\n${jobDescription.substring(0, 3000)}\n\nUSER PROFILE:\n${userContext}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 800,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
        matchScore: result.matchScore || 50,
        matchedSkills: result.matchedSkills || [],
        missingSkills: result.missingSkills || [],
        actionPlan: result.actionPlan || [],
        role: result.role || "Unknown Role",
        company: result.company || ""
    };
};