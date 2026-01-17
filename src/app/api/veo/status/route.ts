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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('task_id');

  if (!taskId) {
    return prettyJson({ error: "task_id is required" }, 400);
  }

  // If it's a Pollinations URL (though usually it wouldn't be passed as taskId)
  if (taskId.startsWith('http')) {
    return prettyJson({ 
      status: "completed",
      video_url: taskId,
      provider: "pollinations.ai"
    });
  }

  try {
    const token = await getAccessToken();
    const location = "us-central1";
    
    // taskId is the operation name: projects/PROJECT_ID/locations/LOCATION/operations/OPERATION_ID
    const response = await fetch(
      `https://${location}-aiplatform.googleapis.com/v1/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return prettyJson({ 
        status: "failed", 
        error: data.error?.message || "Gagal mengecek status" 
      });
    }

    if (data.done) {
      if (data.error) {
        return prettyJson({ 
          status: "failed", 
          error: data.error.message 
        });
      }

      // Extract video URL or bytes from response
      const output = data.response?.outputs?.[0];
      let videoUrl = output?.uri || output?.video?.uri;

      if (videoUrl && videoUrl.startsWith('gs://')) {
        const path = videoUrl.replace('gs://', '');
        const [bucket, ...rest] = path.split('/');
        videoUrl = `https://storage.googleapis.com/${bucket}/${rest.join('/')}`;
      }

      if (videoUrl) {
        return prettyJson({ 
          status: "completed",
          video_url: videoUrl,
          provider: "google-vertex-ai"
        });
      }

    }

    return prettyJson({ 
      status: "processing",
      progress: data.metadata?.progressPercentage || 0
    });

  } catch (error: any) {
    console.error("Error checking Veo status:", error.message);
    if (taskId.length < 50) {
        return prettyJson({ 
            status: "completed",
            video_url: `https://gen.pollinations.ai/video/${encodeURIComponent(taskId)}?model=flux&nologo=true&private=true`,
            provider: "pollinations.ai"
        });
    }
    return prettyJson({ 
      status: "failed",
      error: error.message
    });
  }
}
