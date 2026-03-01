const BrainReq = require("../models/BrainReq");
const { decideFinalLobe } = require("../services/brainRouter.service");
const File = require("../models/file");
const { generateVector } = require("../services/vector.service");
const Memory = require("../models/memory");

const mongoose = require("mongoose");
const Groq = require("groq-sdk");

const groq2 = new Groq({
  apiKey: process.env.GROQ2_API_KEY || process.env.GROQ_API_KEY,
});

exports.createBrainRequest = async (req, res) => {
  try {
    const {
      query,
      fileId,
      mode = "default",
      targetLanguage = "English",
      workspaceId = "General",
    } = req.body;
    const user = req.user;
    const userSettings = user.settings || {};
    let fileMime = null;
    let inputType = "text";

    if (fileId) {
      const file = await File.findById(fileId);
      if (file) {
        fileMime = file.mimeType;
        inputType = "file";
      }
    }

    const result = await decideFinalLobe({
      query,
      fileMime,
      userSettings,
      mode,
      user,
    });

    const doc = await BrainReq.create({
      userId: user._id,
      workspaceId,
      inputType,
      query,
      fileId,
      mode,
      targetLanguage,
      lobe: "auto",
      selectedLobe: result.lobe,
      routerReason: result.reason,
      routerConfidence: result.confidence,
      status: "pending",
    });

    return res.json({
      status: "OK",
      message: "BRAIN REQUEST RECEIVED",
      requestId: doc._id,
      selectedLobe: result.lobe,
      routerReason: result.reason,
      mode: doc.mode,
      confidence: result.confidence,
    });
  } catch (err) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.getResult = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await BrainReq.findById(id);
    if (!doc)
      return res
        .status(404)
        .json({ status: "ERROR", message: "BRAIN REQUEST NOT FOUND" });
    return res.json({ status: "OK", request: doc });
  } catch (err) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.intake = async (req, res) => {
  try {
    const { query, lobe = "auto", fileId = null, mode = "default" } = req.body;
    const inputType = fileId ? "file" : "text";
    const brainReq = await BrainReq.create({
      userId: req.user._id,
      inputType,
      query,
      fileId,
      lobe,
      status: "pending",
    });
    return res.json({
      status: "OK",
      message: "BRAIN REQUEST RECEIVED",
      requestId: brainReq._id,
    });
  } catch (err) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.processSync = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      text,
      mode,
      language = "English",
      workspaceId = "General",
    } = req.body;

    if (!text && mode !== "arch_diagram")
      return res
        .status(400)
        .json({ status: "ERROR", message: "Text required" });

    let prompt = "";
    let memories = [];
    let isMermaid = false;

    switch (mode) {
      case "desi_analogy":
        prompt = `You are a brilliant technical tutor for Indian students. Explain this complex concept using a very relatable Indian cultural analogy (e.g., Mumbai Locals, Dabbawalas, Cricket, Indian traffic, Indian weddings, or IRCTC queues). Make it accurate but fun: "${text}"`;
        break;
      case "eli5":
        prompt = `Explain this concept like I am a 5 year old. Keep it extremely simple, use emojis, use a real world analogy, and avoid all jargon: "${text}"`;
        break;
      case "roast_code":
        prompt = `You are a brutal, sarcastic 10x senior developer. Roast this code snippet ruthlessly for its inefficiencies, but then provide the actual best-practice, highly optimized fix at the end: "${text}"`;
        break;
      case "arch_diagram":
        prompt = `Analyze this technical text and generate ONLY a valid Mermaid.js graph chart (TD or LR) mapping out its architecture, flow, or concepts. Do not use markdown blocks, just return the raw mermaid code starting with 'graph'. Text: "${text}"`;
        isMermaid = true;
        break;
      case "magic_translate":
        prompt = `Translate the following text to ${language}. Preserve technical terms and code snippets in English. Return ONLY the translated text: "${text}"`;
        break;
      case "neural_link":
        const vector = await generateVector(text);
        const pastMemories = await Memory.aggregate([
          {
            $vectorSearch: {
              index: "vector_index",
              path: "vector",
              queryVector: vector,
              numCandidates: 50,
              limit: 3,
              filter: { userId: new mongoose.Types.ObjectId(userId) },
            },
          },
        ]);
        if (pastMemories && pastMemories.length > 0) {
          memories = pastMemories;
          const contextNotes = pastMemories.map((m) => m.content).join("\n- ");
          prompt = `The user is reading: "${text}".\n\nHere are their past notes:\n${contextNotes}\n\nExplain the new text briefly, then EXPLICITLY connect it to their past notes. Frame it as "I noticed you previously learned about..."`;
        } else {
          prompt = `Explain this concept simply: "${text}". Add a note at the end saying "You have no past memories saved about this topic yet. Save this to build your Neural Graph!"`;
        }
        break;
      default:
        prompt = `Provide a helpful technical explanation for this text: "${text}"`;
    }

    const completion = await groq2.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: isMermaid ? 0.1 : 0.4,
      messages: [{ role: "user", content: prompt }],
    });

    let responseText = completion.choices[0]?.message?.content || "";

    if (isMermaid) {
      responseText = responseText
        .replace(/```mermaid/gi, "")
        .replace(/```/g, "")
        .trim();
      return res.status(200).json({ status: "OK", mermaid: responseText });
    }

    return res
      .status(200)
      .json({ status: "OK", result: responseText, memories });
  } catch (err) {
    console.error("[ProcessSync Error]", err);
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.getDreamJournal = async (req, res) => {
  try {
    const userId = req.user._id;
    const dreams = await BrainReq.find({
      userId: userId,
      query: "INTERNAL_DREAM_PROTOCOL",
      status: "done",
    })
      .select("output createdAt")
      .sort({ createdAt: -1 });
    const journal = dreams.map((d) => ({
      id: d.id,
      date: d.createdAt,
      title: d.output?.title || "Untitled Dream",
      insight: d.output?.insight || "No Insight Available",
      action: d.output?.action || "Reflect On This",
    }));
    return res.json({ status: "OK", count: journal.length, journal: journal });
  } catch (err) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.coAsk = async (req, res) => {
  try {
    const { text, mode } = req.body;
    if (!text)
      return res
        .status(400)
        .json({ status: "ERROR", message: "Text required" });

    const prompt =
      mode === "desi_analogy"
        ? `Explain this concept with an Indian analogy: "${text}"`
        : `Explain: "${text}"`;

    const completion = await groq2.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    return res
      .status(200)
      .json({
        status: "OK",
        response: completion.choices[0]?.message?.content || "",
      });
  } catch (err) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.vision = async (req, res) => {
  try {
    const { image, workspaceId = "General" } = req.body;
    const userId = req.user._id;

    if (!image || !image.startsWith("data:image/"))
      return res
        .status(400)
        .json({
          status: "ERROR",
          message: "image field must be a base64 data URL",
        });

    const [header, base64Data] = image.split(",");
    const mimeType = header.match(/data:(.*);base64/)?.[1] || "image/jpeg";

    const completion = await groq2.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "You are an expert technical educator analyzing a screen capture. Analyze this screenshot carefully and provide: \n1. **What's happening here?** (Brief overview) \n2. **Technical Breakdown** (Explain any code, UI, or errors visible) \n3. **Key Takeaways** \nBe specific, technically accurate, and format with markdown.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Data}` },
            },
          ],
        },
      ],
    });

    const explanation = completion.choices[0]?.message?.content || "";

    try {
      const vector = await generateVector(explanation.substring(0, 1000));
      await Memory.create({
        userId,
        content: `[Snap & Learn]\n${explanation.substring(0, 2000)}`,
        types: "answer",
        workspaceId,
        vector,
        nextReviewDate: new Date(),
        decayRate: 0,
      });
    } catch (dbErr) {
      console.warn(
        "Background memory save failed, but proceeding",
        dbErr.message,
      );
    }

    return res.status(200).json({
      status: "OK",
      result: explanation,
      autoSaved: true,
      workspaceId,
    });
  } catch (err) {
    console.error("[Vision Error]", err);
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
};

exports.translate = async (req, res) => {
  try {
    const { text, targetLanguage = "Hindi" } = req.body;
    if (!text || text.trim().length < 2)
      return res
        .status(400)
        .json({ status: "ERROR", message: "text field is required" });

    const prompt = `Translate the following text to ${targetLanguage}. Rules: Preserve technical terms, proper nouns, and code snippets as-is (in English). For Hinglish: mix Hindi and English naturally. Return ONLY the translated text. Text: "${text}"`;

    const completion = await groq2.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });

    const translation = (completion.choices[0]?.message?.content || "")
      .trim()
      .replace(/^["']|["']$/g, "");

    return res
      .status(200)
      .json({ status: "OK", translation, sourceText: text, targetLanguage });
  } catch (err) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
};