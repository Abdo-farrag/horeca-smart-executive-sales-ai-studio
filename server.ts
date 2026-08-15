import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Express API Routes for Executive Sales AI Assistant
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, context, language = "ar" } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        text: language === "ar"
          ? "مرحباً! نظام المساعد الذكي هوريكا تعمل في النمط التحليلي المحلي المتقدم. يرجى توفير مفتاح GEMINI_API_KEY للحصول على تحليلات ذكاء اصطناعي فورية ومباشرة."
          : "Hello! The Horeca AI Executive Assistant is operating in advanced local analytical mode. Provide GEMINI_API_KEY in secrets for live AI capabilities.",
        mode: "local_demo"
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `You are the Executive Sales Intelligence AI Assistant for Horeca Smart & MAS (B2B Food Distribution platform in the HORECA sector - Restaurants, Cafes, Hotels, Bakeries, Catering).
You provide concise, executive-level data-driven insights for C-Level Executives (CEO, Commercial Director, Sales Director, Sales Managers).
Response Language: ${language === "ar" ? "Arabic (العربية)" : "English"}.
Use professional enterprise business terminology, clear bullet points, key metrics formatting, and actionable strategic recommendations.
CompanyContext: ${JSON.stringify(context || {})}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      error: "AI service failed",
      message: error.message,
    });
  }
});

// Start Express + Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Horeca Smart Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
