import { NextResponse } from 'next/server';
import { prettyJson } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt');
  const quality = searchParams.get('quality') || 'standard';

  if (!prompt) {
    return prettyJson({ error: 'Prompt is required' }, 400);
  }

  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  
  const modelType = quality === 'high' ? 'veo-3.0-generate-001' : 'veo-3.0-fast-generate-001';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelType}:predictLongRunning?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate video');
    }

    return prettyJson({
      success: true,
      status: 'processing',
      operation: data.name,
      message: 'Video is being generated. Please check back in a few minutes using the operation name.',
      model_used: modelType
    });

  } catch (error: any) {
    return prettyJson({ error: error.message }, 500);
  }
}
