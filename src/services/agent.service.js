const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AGENT_SYSTEM_PROMPT = `You are a browser automation planner. Given a natural language command, output ONLY a valid JSON object.

CRITICAL URL BYPASS RULES (use these instead of clicking UI elements when possible):
- Google search for "X": navigate to "https://www.google.com/search?q=X"
- Amazon search for "X": navigate to "https://www.amazon.in/s?k=X"  
- YouTube search for "X": navigate to "https://www.youtube.com/results?search_query=X"
- GitHub search for "X": navigate to "https://github.com/search?q=X"
- Gmail compose: navigate to "https://mail.google.com/mail/?view=cm&fs=1"
- LinkedIn jobs "X" in "City": navigate to "https://www.linkedin.com/jobs/search/?keywords=X&location=City"
- Twitter search "X": navigate to "https://twitter.com/search?q=X"
- MDN search "X": navigate to "https://developer.mozilla.org/en-US/search?q=X"

SELECTOR RULES for click/type actions:
- Prefer aria-label: [aria-label="Search"]
- Prefer data-testid: [data-testid="tweetTextarea_0"]
- For inputs, use semantic text like "Search input" or "Message box" — the executor has 12 fallback strategies
- For buttons, use partial text like "Submit" or "Send"
- ALWAYS add a wait of 1500ms after navigate actions
- ALWAYS add a wait of 800ms after click actions that open modals

Respond ONLY with this JSON structure:
{
  "goal": "brief description of what will be accomplished",
  "actions": [
    {"type": "navigate", "url": "https://..."},
    {"type": "wait", "ms": 1500},
    {"type": "type", "selector": "[aria-label='Search']", "value": "text", "pressEnter": true},
    {"type": "click", "selector": "button text or aria-label"},
    {"type": "scroll", "y": 400},
    {"type": "read", "selector": "body"}
  ]
}`;

const DEBUG_SYSTEM_PROMPT = `You are an expert debugging assistant. Analyze the error and provide:
1. **Root Cause**: What is fundamentally causing this error (1-2 sentences)
2. **Exact Fix**: Working code that solves it (use code blocks)
3. **Why This Works**: Brief technical explanation
4. **Prevention**: How to avoid this in future
Be concise, precise, and immediately actionable. Format with markdown.`;

const RESEARCH_SYSTEM_PROMPT = `You are a world-class technical researcher and educator. Create a comprehensive, well-structured research report.
Format your report with:
- **Executive Summary**: 2-3 sentences overview
- **Core Concepts**: Key ideas explained clearly  
- **How It Works**: Technical deep-dive with examples
- **Real-World Applications**: Practical use cases
- **Common Pitfalls**: What to avoid
- **Key Takeaways**: 3-5 bullet points
- **Further Reading**: Suggest what to explore next
Use markdown formatting. Be thorough but accessible. Include code examples where relevant.`;

function _extractSearchQuery(errorText) {
  return errorText
    .replace(/at\s+[\w.<>]+\s+\(.+?\)/g, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
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
  return html
    .replace(/<[^>]+>/g, "")
    .trim()
    .slice(0, 800);
}

// 1. The Auto-Agent Planner
exports.generatePlan = async (prompt) => {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: AGENT_SYSTEM_PROMPT },
      { role: "user", content: `Command: "${prompt}"` },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from GROQ");

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.actions))
    throw new Error("Invalid plan structure from AI");

  parsed.actions = parsed.actions
    .filter((a) => a.type && typeof a.type === "string")
    .slice(0, 20);
  return parsed;
};

// 2. The StackOverflow Auto-Debugger
exports.generateDebugFix = async (errorText, code) => {
  const errorType = _classifyError(errorText);
  const searchQuery = _extractSearchQuery(errorText);

  let sources = [];
  try {
    const STACK_KEY = process.env.STACK_EXCHANGE_KEY || "";
    const soUrl = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(searchQuery)}&accepted=True&site=stackoverflow&filter=withbody&pagesize=4&key=${STACK_KEY}`;
    const soRes = await fetch(soUrl);
    const soData = await soRes.json();
    sources = (soData.items || []).slice(0, 4).map((item) => ({
      title: item.title,
      link: item.link,
      score: item.score,
      body: _stripHtml(item.body),
      tags: item.tags || [],
    }));
  } catch (e) {
    console.warn("[Brain OS] StackOverflow fetch failed:", e.message);
  }

  const contextParts = [
    `Error:\n${errorText}`,
    code ? `\nCode Context:\n${code.slice(0, 800)}` : "",
    sources.length
      ? `\nTop StackOverflow Results:\n${sources.map((s, i) => `${i + 1}. "${s.title}" (score: ${s.score})\n${s.body.slice(0, 400)}`).join("\n\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    max_tokens: 1200,
    messages: [
      { role: "system", content: DEBUG_SYSTEM_PROMPT },
      { role: "user", content: contextParts },
    ],
  });

  return { errorType, sources, fix: completion.choices[0].message.content };
};

// 3. The Deep Researcher
exports.generateResearchReport = async (topic, depth) => {
  let wikContent = "";
  let hnContent = "";
  const sources = [];

  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`,
    );
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      wikContent = wikiData.extract || "";
      if (wikiData.content_urls?.desktop?.page)
        sources.push({
          title: `Wikipedia: ${wikiData.title}`,
          url: wikiData.content_urls.desktop.page,
        });
    }
  } catch {}

  try {
    const hnRes = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&hitsPerPage=5&tags=story`,
    );
    if (hnRes.ok) {
      const hnData = await hnRes.json();
      const hits = (hnData.hits || []).slice(0, 3);
      hnContent = hits
        .map((h) => `- "${h.title}" (${h.points} pts)`)
        .join("\n");
      hits.forEach((h) => {
        if (h.url) sources.push({ title: h.title, url: h.url });
      });
    }
  } catch {}

  const maxLen = depth === "quick" ? 600 : depth === "deep" ? 1000 : 1500;
  const maxTokens = depth === "quick" ? 800 : depth === "deep" ? 1500 : 2500;

  const contextParts = [
    `Research Topic: "${topic}"`,
    wikContent ? `Wikipedia Summary:\n${wikContent.slice(0, maxLen)}` : "",
    hnContent ? `HackerNews Discussions:\n${hnContent}` : "",
    `Depth Level: ${depth}`,
    `Please create a ${depth === "quick" ? "concise" : depth === "deep" ? "comprehensive" : "expert-level"} research report.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: RESEARCH_SYSTEM_PROMPT },
      { role: "user", content: contextParts },
    ],
  });

  return { report: completion.choices[0].message.content, sources, topic };
};