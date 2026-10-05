declare const process: {
  env: Record<string, string | undefined>;
};

interface AnalyzeFoodRequest {
  image?: unknown;
  mimeType?: unknown;
}

interface ApiRequest {
  method?: string;
  body?: AnalyzeFoodRequest | string;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
}

interface FoodAnalysis {
  foodName: string;
  confidence: number;
  servingEstimate: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  notes: string;
}

const MODEL = "gemini-2.5-flash-lite";

// Keep the image reasonably small for a serverless request.
const MAX_IMAGE_BASE64_LENGTH = 3_500_000;

const responseSchema = {
  type: "object",
  properties: {
    foodName: { type: "string" },
    confidence: { type: "number" },
    servingEstimate: { type: "number" },
    servingUnit: { type: "string" },
    calories: { type: "number" },
    protein: { type: "number" },
    carbs: { type: "number" },
    fat: { type: "number" },
    fiber: { type: "number" },
    notes: { type: "string" },
  },
  required: [
    "foodName",
    "confidence",
    "servingEstimate",
    "servingUnit",
    "calories",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "notes",
  ],
};

function parseBody(
  body: AnalyzeFoodRequest | string | undefined,
): AnalyzeFoodRequest | null {
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as AnalyzeFoodRequest;
    } catch {
      return null;
    }
  }

  return body;
}

function isSupportedMimeType(value: string): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(value);
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({
      error: "Method Not Allowed",
      message: "Use POST /api/analyze-food.",
    });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error: "Server Configuration Error",
      message: "GEMINI_API_KEY is not configured.",
    });
    return;
  }

  const body = parseBody(req.body);

  const image = typeof body?.image === "string" ? body.image : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";

  if (!image || !mimeType) {
    res.status(400).json({
      error: "Invalid Request",
      message: "image and mimeType are required.",
    });
    return;
  }

  if (!isSupportedMimeType(mimeType)) {
    res.status(400).json({
      error: "Invalid Image Type",
      message: "Supported image types are JPEG, PNG, and WebP.",
    });
    return;
  }

  if (image.length > MAX_IMAGE_BASE64_LENGTH) {
    res.status(413).json({
      error: "Image Too Large",
      message: "The image is too large. Please send a smaller image.",
    });
    return;
  }

  const prompt = `
Analyze the food shown in this image for a personal nutrition-tracking app.

Identify the most likely food or dish and estimate one visible serving.

Nutrition values are estimates only, not medical or laboratory measurements.

Return:
- foodName: concise food or dish name
- confidence: number from 0 to 1 representing confidence in the food identification
- servingEstimate: estimated quantity for the identified serving
- servingUnit: simple unit such as plate, bowl, piece, slice, cup, or serving
- calories: estimated kcal for the identified serving
- protein: estimated grams
- carbs: estimated grams
- fat: estimated grams
- fiber: estimated grams
- notes: short explanation of uncertainty or important assumptions

If the image does not clearly contain food, identify that in foodName and set confidence low.

Do not invent precise ingredients that cannot reasonably be inferred from the image.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: image,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
      },
    );

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
      error?: {
        message?: string;
      };
    };

    if (!response.ok) {
      res
        .status(
          response.status >= 400 && response.status < 600
            ? response.status
            : 502,
        )
        .json({
          error: "Gemini API Error",
          message: data.error?.message ?? "Gemini did not accept the request.",
        });

      return;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      res.status(502).json({
        error: "Invalid Gemini Response",
        message: "Gemini returned no structured analysis.",
      });

      return;
    }

    let analysis: FoodAnalysis;

    try {
      analysis = JSON.parse(text) as FoodAnalysis;
    } catch {
      res.status(502).json({
        error: "Invalid Gemini Response",
        message: "Gemini returned invalid JSON.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      estimated: true,
      model: MODEL,
      analysis,
    });
  } catch {
    res.status(500).json({
      error: "Analysis Failed",
      message: "The food image could not be analyzed.",
    });
  }
}
