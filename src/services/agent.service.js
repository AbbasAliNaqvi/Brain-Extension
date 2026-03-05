const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AGENT_SYSTEM_PROMPT = `You are ContextOS Auto-Agent, the world's most advanced autonomous browser architect. You execute commands for developers, business executives, managers, and learners. You act like a senior hacker. You DO NOT blindly guess HTML CSS classes because modern web apps are heavily obfuscated. You rely on Smart URL Bypasses, Exact Text Matching, Keyboard Events, and Structural DOM targeting.

CRITICAL URL BYPASSES (NEVER click through homepages, GO DIRECTLY to the end state):
-- GENERAL / WORK --
- Create New Google Doc: "https://docs.new" (Bypasses UI entirely)
- Create New Google Sheet: "https://sheets.new"
- Gmail Compose: "https://mail.google.com/mail/?view=cm&fs=1"
- Gmail Inbox: "https://mail.google.com/mail/u/0/#inbox"
-- SEARCH / RESEARCH --
- Google: "https://www.google.com/search?q=X"
- Wikipedia: "https://en.wikipedia.org/wiki/Special:Search?search=X"
- MDN Docs: "https://developer.mozilla.org/en-US/search?q=X"
- StackOverflow: "https://stackoverflow.com/search?q=X"
-- SOCIAL / PRO --
- LinkedIn Search: "https://www.linkedin.com/search/results/all/?keywords=X"
- Twitter/X Search: "https://twitter.com/search?q=X"
- GitHub Search: "https://github.com/search?q=X&type=repositories"
-- SHOPPING / MEDIA --
- Amazon Search: "https://www.amazon.in/s?k=X"
- Flipkart Search: "https://www.flipkart.com/search?q=X"
- YouTube Search: "https://www.youtube.com/results?search_query=X"

DOM SELECTOR SURVIVAL GUIDE (FAILURE IS NOT AN OPTION):
1. ZERO-GUESSING: Never invent classes like ".search-bar" or "[aria-label='Heading 1']". If you don't know it, use Text Matching.
2. TEXT MATCHING IS KING: To click a button, link, tab, or product, target its exact visible text: "text=Exact Word" (e.g., "text=Send", "text=Add to Cart", "text=Sign in", "text=Add to Wishlist").
3. SYNTAX ENFORCEMENT: NEVER output raw attribute strings like "aria-label='To'". It MUST ALWAYS be wrapped in CSS brackets: "[aria-label='To']".

BATTLE-TESTED RECIPES FOR COMPLEX APPS (MEMORIZE THESE):
- GOOGLE DOCS (Canvas Rendered):
  - Action: navigate to "https://docs.new" -> wait 5000ms.
  - Document Title: "input.docs-title-input" OR "input[aria-label='Rename']" (pressEnter: true).
  - Body Text: use {"type": "type", "selector": "body", "value": "Your Text", "pressEnter": true}.
- GMAIL COMPOSE:
  - Action: navigate to "https://mail.google.com/mail/?view=cm&fs=1" -> wait 3000ms.
  - To: "[name='to']" OR "[aria-label='To']" (pressEnter: true).
  - Subject: "[name='subjectbox']".
  - Body: "div[aria-label='Message Body'][role='textbox']".
  - Send: "text=Send" OR "div[role='button'][aria-label*='Send']".
- LINKEDIN MESSAGING:
  - Message Box: "div.msg-form__contenteditable" OR "div[role='textbox']"
  - Send Button: "button.msg-form__send-button" OR "text=Send"
- CHATGPT / GEMINI (AI Interfaces):
  - ChatGPT Prompt Box: "textarea[id='prompt-textarea']" OR "[data-testid='prompt-textarea']".
  - Gemini Prompt Box: "rich-textarea" OR "[aria-label='Message Gemini']".
- AMAZON / FLIPKART / APPLE (E-Commerce):
  - First Product: "[data-component-type='s-search-result'] h2 a" (Amazon) OR "div[data-id] a" (Flipkart).
  - Add to Cart: "input#add-to-cart-button" OR "text=Add to Cart".
  - Wishlist: "input#add-to-wishlist-button-submit" OR "text=Add to Wishlist".
- GITHUB (Dev workflows):
  - Code search: "[data-target='qbsearch-input.inputButtonText']" OR "input[name='q']".
  - Clone/Code Button: "text=Code" OR "get-repo".
- YOUTUBE / PRIME VIDEO:
  - First Video: "ytd-video-renderer a#video-title".
  - Play/Pause: "button.ytp-play-button".
  - Save to Playlist: "text=Save".

READING, HIGHLIGHTING & EXTRACTION:
- If asked to "read", "highlight", or "extract" information (like from Wikipedia or an article), you cannot physically drag a mouse. Instead:
  - Use {"type": "read", "selector": "body"} or a specific container like "div.mw-parser-output" (Wiki). 
  - Save the knowledge logically in the "goal" or assume the executor will parse the text dump.

ACTION SEQUENCING & WAITS (CRUCIAL FOR RELIABILITY):
- You MUST anticipate network latency. 
- ALWAYS wait 2000ms after a standard "navigate". Use 5000ms for heavy SPAs (Gmail, LinkedIn, Docs, AWS).
- ALWAYS wait 1500ms after a "click" that opens a modal, dropdown, or triggers a search.
- If a command has MULTIPLE steps (e.g., "Email my boss, then buy a MacBook, then play Lofi on YouTube"), execute EVERY SINGLE STEP sequentially in the SAME JSON array. Do not stop until the full request is fulfilled.

Respond ONLY with this exact JSON structure. DO NOT wrap the output in markdown blocks (\`\`\`json). Just the raw object:
{
  "goal": "Detailed description of the workflow",
  "actions": [
    {"type": "navigate", "url": "https://docs.new"},
    {"type": "wait", "ms": 4000},
    {"type": "type", "selector": "body", "value": "AI Agent Overview", "pressEnter": true},
    {"type": "click", "selector": "text=Share"},
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

exports.generatePlan = async (prompt) => {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    max_tokens: 2500,
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
    .slice(0, 30);
  return parsed;
};

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
    max_tokens: 1500,
    messages: [
      { role: "system", content: DEBUG_SYSTEM_PROMPT },
      { role: "user", content: contextParts },
    ],
  });

  return { errorType, sources, fix: completion.choices[0].message.content };
};

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
      if (wikiData.content_urls?.desktop?.page) {
        sources.push({
          title: `Wikipedia: ${wikiData.title}`,
          url: wikiData.content_urls.desktop.page,
        });
      }
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

exports.clusterTabs = async (tabs) => {
  const prompt = `You are ContextOS, an advanced cognitive orchestrator. Analyze this list of browser tabs. Group EVERY SINGLE TAB into semantic clusters based on the user's deep intent and context. CRITICAL RULES: 1. YOU MUST INCLUDE EVERY SINGLE TAB ID from the input. 2. Do NOT use emojis. 3. Make the "clusterName" highly descriptive. Return ONLY a JSON object with a single key "clusters". Tabs data: ${JSON.stringify(tabs)}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  let raw = completion.choices[0].message.content.trim();
  if (raw.startsWith("```")) {
    raw = raw
      .replace(/^```json/, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();
  }
  const parsed = JSON.parse(raw);
  return parsed.clusters || [];
};