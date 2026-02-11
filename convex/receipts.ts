"use node";

// Minimal declaration to satisfy TypeScript without pulling in full @types/node.
declare const process: {
  env: {
    OPENROUTER_API_KEY?: string;
    [key: string]: string | undefined;
  };
};

import { action } from "./_generated/server";
import { v } from "convex/values";

export const scanReceipt = action({
  args: {
    base64Image: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    console.log("OPENROUTER_API_KEY", process.env);
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    console.log("apiKey", apiKey);
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-nano-12b-v2-vl:free",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract the following from this receipt image and respond ONLY with a JSON object (no markdown, no explanation):
{
  "amount": <total amount as a number>,
  "currency": "<3-letter ISO currency code, e.g. INR, USD, EUR>",
  "date": "<date in YYYY-MM-DD format>",
  "description": "<short 2-5 word description of what was purchased> (eg: Grocery purchase at X store)"
}

If you cannot determine a field, use these defaults:
- amount: 0
- currency: "INR"
- date: "${new Date().toISOString().split("T")[0]}"
- description: "Receipt expense"`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${args.mimeType};base64,${args.base64Image}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
    }
    console.log("response", response);

    const data = await response.json();
    const content: string =
      data.choices?.[0]?.message?.content ?? "";

    // Robust JSON parsing: try direct → regex extraction → fallback
    let parsed: { amount?: number; currency?: string; date?: string; description?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown fences or surrounding text
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = {};
        }
      } else {
        parsed = {};
      }
    }
    console.log("parsed", parsed);

    const today = new Date().toISOString().split("T")[0];

    // Validate and normalize
    const amount = typeof parsed.amount === "number" && parsed.amount > 0
      ? Math.round(parsed.amount * 100) / 100
      : 0;

    const currency =
      typeof parsed.currency === "string" && /^[A-Z]{3}$/.test(parsed.currency)
        ? parsed.currency
        : "INR";

    const date =
      typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
        ? parsed.date
        : today;

    const description =
      typeof parsed.description === "string" && parsed.description.trim().length > 0
        ? parsed.description.trim()
        : "Receipt expense";

    return { amount, currency, date, description };
  },
});
