import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { prettyJson } from "@/lib/utils";

async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, quality = "720p", model = "veo-3.1-fast-generate-001" } = await req.json();

    if (!prompt) {
      return prettyJson({ error: "Prompt is required" }, 400);
    }

    // Try Google Vertex AI first
    try {
      const token = await getAccessToken();
      const projectId = process.env.GOOGLE_PROJECT_ID;
      const location = "us-central1"; 
      
      const response = await fetch(
        `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predictLongRunning`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "16:9",
              durationSeconds: quality === "1080p" ? 8 : 5,
            },
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.name) {
        return prettyJson({ 
          success: true, 
          status: "processing",
          task_id: data.name,
          provider: "google-vertex-ai",
          model: model
        });
      }
      
      console.warn("Google Vertex AI failed, falling back to Pollinations:", data);
    } catch (googleError: any) {
      console.error("Google Vertex AI Error:", googleError.message);
    }

    // Fallback to Pollinations.ai
    const encodedPrompt = encodeURIComponent(prompt);
    const videoUrl = `https://gen.pollinations.ai/video/${encodedPrompt}?model=flux&nologo=true&private=true`;

    return prettyJson({ 
      success: true, 
      status: "completed",
      type: "video",
      video_url: videoUrl,
      provider: "pollinations.ai",
      model: "flux-video-fallback",
      prompt: prompt
    });

  } catch (error: any) {
    console.error("Error in Veo generate:", error.message);
    return prettyJson({ 
      error: "Gagal memproses permintaan",
      detail: error.message
    }, 500);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get('prompt');
  
  if (!prompt) {
    return prettyJson({ 
      error: "Prompt is required",
      usage: "/api/veo/generate?prompt=your prompt here"
    }, 400);
  }

  const encodedPrompt = encodeURIComponent(prompt);
  const videoUrl = `https://gen.pollinations.ai/video/${encodedPrompt}?model=flux&nologo=true&private=true`;

  return prettyJson({ 
    success: true, 
    status: "completed",
    video_url: videoUrl,
    provider: "pollinations.ai"
  });
}
