import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  sanitizeExecutiveContext,
  sanitizeDrillDownContext,
  sanitizeHistoryText,
  AiContextSecurityViolationError,
  AiContextTooLargeError,
} from "./src/services/ai/aiContextSanitizer";
import { AiContextMode, AiQueryIntent } from "./src/types/ai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Health check endpoint for Cloud Run and monitoring probes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Express API Route for Executive Sales AI Assistant (V2 Security Boundary)
app.post("/api/ai/chat", async (req, res) => {
  const startTime = Date.now();
  let contextMode: AiContextMode = "AGGREGATED";
  let intent: AiQueryIntent | undefined = undefined;

  try {
    const {
      message,
      history,
      analyticsContext,
      drillDownContext,
      contextMode: reqMode,
      intent: reqIntent,
      language = "ar",
    } = req.body;

    contextMode = reqMode === "DRILL_DOWN" ? "DRILL_DOWN" : "AGGREGATED";
    intent = reqIntent;

    // 1. Basic Message Validation
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Message is required and must be a non-empty string.",
        },
      });
    }

    // 2. Deterministic Intent Bypass (Zero Gemini tokens spent, instantaneous safe return)
    if (intent === "PROHIBITED_DATA_REQUEST") {
      const responseText =
        language === "ar"
          ? "عذرًا، بيانات التواصل الشخصية والمعلومات البنكية وتفاصيل التحصيلات الفردية غير متاحة لأسباب تتعلق بالخصوصية وأمن البيانات."
          : "Sorry, personal contact details, banking data, and individual collection records are restricted for privacy and data security.";

      console.log(
        "[AI_AUDIT_LOG]",
        JSON.stringify({
          intent,
          contextMode,
          aggregatePayloadBytes: 0,
          drillDownPayloadBytes: 0,
          historyMessageCount: Array.isArray(history) ? history.length : 0,
          recordCounts: { orders: 0, customers: 0, products: 0 },
          latencyMs: Date.now() - startTime,
          geminiStatus: "BYPASSED_DETERMINISTIC",
          errorType: null,
        })
      );

      return res.json({ text: responseText });
    }

    if (intent === "PAYMENT_STATUS") {
      const responseText =
        language === "ar"
          ? "حالة السداد وموقف التحصيلات غير مسجلة في سجل المعاملات التحليلي المتاح حالياً."
          : "Payment status and collection ledger data are not available in the analytical dataset.";

      console.log(
        "[AI_AUDIT_LOG]",
        JSON.stringify({
          intent,
          contextMode,
          aggregatePayloadBytes: 0,
          drillDownPayloadBytes: 0,
          historyMessageCount: Array.isArray(history) ? history.length : 0,
          recordCounts: { orders: 0, customers: 0, products: 0 },
          latencyMs: Date.now() - startTime,
          geminiStatus: "BYPASSED_DETERMINISTIC",
          errorType: null,
        })
      );

      return res.json({ text: responseText });
    }

    // 3. Server-Side Context Sanitization & Allowlist Enforcement
    let sanitizedAggregate = undefined;
    let sanitizedDrillDown = undefined;

    if (contextMode === "DRILL_DOWN") {
      if (!drillDownContext && !analyticsContext) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "Drill-down context or analytics context is required for DRILL_DOWN mode.",
          },
        });
      }

      if (drillDownContext) {
        sanitizedDrillDown = sanitizeDrillDownContext(drillDownContext);
      }
      if (analyticsContext) {
        sanitizedAggregate = sanitizeExecutiveContext(analyticsContext);
      }
    } else {
      // AGGREGATED mode
      if (!analyticsContext || typeof analyticsContext !== "object") {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "analyticsContext is required for AGGREGATED mode.",
          },
        });
      }
      sanitizedAggregate = sanitizeExecutiveContext(analyticsContext);
      // Ensure drillDownContext is dropped in aggregated mode
      sanitizedDrillDown = undefined;
    }

    // 4. API Key Verification
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: {
          code: "CONFIG_ERROR",
          message: "GEMINI_API_KEY is not configured on the server.",
        },
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

    // 5. System Instructions & Dual Context Prompt Building
    const systemInstruction = `You are the Executive Sales Intelligence AI Assistant for Horeca Smart & MAS (a premier B2B Food & Beverage distribution platform serving hotels, restaurants, cafes, bakeries, and catering).

PRIMARY MANDATES:
1. STRICT GROUNDING: You have access ONLY to the sanitized analytical data provided below in JSON. Use ONLY numbers, percentages, and metrics provided in this context.
2. ZERO HALLUCINATION: Never invent, extrapolate, or estimate missing financial figures, customer names, product names, or order records. Preserve null semantics (if a metric is null, it is unavailable; do not assume 0%).
3. TRANSACTION & CUSTOMER FACTS:
   - In AGGREGATED mode: You must only discuss macro metrics, KPIs, and aggregate rollups. No individual customer identities are provided.
   - In DRILL_DOWN mode: You may reference the specific customer, product, orders, and action items provided in DrillDownContext. Transaction facts (order counts, totals, dates) must be grounded solely in DrillDownContext.recentOrders.
4. INSUFFICIENT DATA PROTOCOL: If the user asks about data not present in the provided context (e.g. personal contact numbers, bank accounts, raw payment slips, or transactions outside the range), you MUST respond with:
"البيانات المتاحة لا تكفي للإجابة بدقة." (or in English if English query: "The available analytical data is insufficient to answer this accurately.")
5. THREE-TIER EXECUTIVE RESPONSE STRUCTURE: For analytical questions, structure your response clearly:
- [الحقائق والأرقام]: Verifiable metrics, names, and numbers taken directly from the context.
- [التحليل والتفسير]: Strategic business interpretation and sales insights.
- [التوصيات التنفيذية]: 2 to 4 concise, actionable sales management recommendations.
6. READ-ONLY SCOPE: You are a read-only advisor. You cannot perform operational actions (cannot update records, create tasks, or change filter settings). Never claim an action was executed.
7. NO DIRECT DATABASE ACCESS: Never claim or imply direct live access to Odoo tables, Supabase rows, or banking ledgers.
8. LANGUAGE: Respond in Arabic when the user asks in Arabic. Use high-level, clear commercial executive Arabic terminology.

${sanitizedAggregate ? `ExecutiveAIContext (Aggregated):\n${JSON.stringify(sanitizedAggregate, null, 2)}\n` : ''}
${sanitizedDrillDown ? `ExecutiveDrillDownContext:\n${JSON.stringify(sanitizedDrillDown, null, 2)}\n` : ''}`;

    // 6. Safe Multi-Turn History (sanitized text, max 8 items)
    const validHistory = Array.isArray(history) ? history.slice(-8) : [];
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const item of validHistory) {
      if (item && item.text && (item.role === 'user' || item.role === 'model')) {
        contents.push({
          role: item.role === 'model' ? 'model' : 'user',
          parts: [{ text: sanitizeHistoryText(String(item.text)) }],
        });
      }
    }

    // Append current user message (sanitized)
    contents.push({
      role: 'user',
      parts: [{ text: sanitizeHistoryText(message.trim()) }],
    });

    // 7. Model Execution
    const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-flash-latest"];
    let responseText = "";
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} attempt failed:`, err?.message || err);
      }
    }

    if (!responseText) {
      throw lastError || new Error("Unable to generate AI content from candidate models.");
    }

    // 8. Safe Audit Logging (NO PII, NO CUSTOMER NAMES, NO PROMPT, NO API KEY)
    const aggregateBytes = sanitizedAggregate
      ? new TextEncoder().encode(JSON.stringify(sanitizedAggregate)).length
      : 0;
    const drillDownBytes = sanitizedDrillDown
      ? new TextEncoder().encode(JSON.stringify(sanitizedDrillDown)).length
      : 0;

    const ordersCount = sanitizedDrillDown?.recentOrders?.length || 0;
    const customersCount =
      (sanitizedDrillDown?.productTopCustomers?.length || 0) +
      (sanitizedDrillDown?.decliningCustomers?.length || 0) +
      (sanitizedDrillDown?.lostCustomers?.length || 0) +
      (sanitizedDrillDown?.riskActionCenter?.length || 0) +
      (sanitizedDrillDown?.targetCustomer ? 1 : 0);
    const productsCount =
      (sanitizedDrillDown?.customerProductHistory?.stoppedProducts?.length || 0) +
      (sanitizedDrillDown?.customerProductHistory?.favoriteProducts?.length || 0) +
      (sanitizedDrillDown?.crossSellCandidates?.length || 0) +
      (sanitizedDrillDown?.targetProduct ? 1 : 0);

    console.log(
      "[AI_AUDIT_LOG]",
      JSON.stringify({
        intent: intent || "GENERAL",
        contextMode,
        aggregatePayloadBytes: aggregateBytes,
        drillDownPayloadBytes: drillDownBytes,
        historyMessageCount: validHistory.length,
        recordCounts: {
          orders: ordersCount,
          customers: customersCount,
          products: productsCount,
        },
        latencyMs: Date.now() - startTime,
        geminiStatus: "SUCCESS",
        errorType: null,
      })
    );

    return res.json({ text: responseText });
  } catch (error: any) {
    if (error instanceof AiContextSecurityViolationError) {
      console.warn("[AI_SECURITY_VIOLATION]", error.message);
      return res.status(400).json({
        error: {
          code: "AI_CONTEXT_SECURITY_VIOLATION",
          message: "Context contains prohibited security violation.",
        },
      });
    }

    if (error instanceof AiContextTooLargeError) {
      console.warn("[AI_CONTEXT_TOO_LARGE]", error.message);
      return res.status(400).json({
        error: {
          code: "AI_CONTEXT_TOO_LARGE",
          message: "Context payload exceeds maximum allowed size.",
        },
      });
    }

    console.error("Gemini API Error:", error?.message || error);
    return res.status(503).json({
      error: {
        code: "AI_SERVICE_UNAVAILABLE",
        message: "Failed to communicate with AI model service.",
      },
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

