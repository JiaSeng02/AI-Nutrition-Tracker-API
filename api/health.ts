interface HealthResponse {
  status: "ok";
  service: string;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: HealthResponse) => void;
}

interface ApiRequest {
  method?: string;
}

export default function handler(req: ApiRequest, res: ApiResponse): void {
  if (req.method !== "GET") {
    res.status(405).json({
      status: "ok",
      service: "Method Not Allowed",
    });
    return;
  }

  res.status(200).json({
    status: "ok",
    service: "ai-nutrition-tracker-api",
  });
}
