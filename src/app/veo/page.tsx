"use client";

import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Loader2, Play, Video, Image as ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function VeoPage() {
  const [prompt, setPrompt] = useState("A majestic silver spaceship docking into a massive ring-shaped space station orbiting Saturn, glowing blue ion engines, thousands of tiny lights on the station's surface, cinematic camera move from wide to close-up, high-speed space dust particles, interstellar lighting, hyper-detailed.");
  const [quality, setQuality] = useState("720p");
  const [isLoading, setIsLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setTaskId(null);
    setVideoUrl(null);
    setImageUrl(null);
    setIsFallback(false);
    setStatus("Initiating generation...");

    try {
      const response = await fetch("/api/veo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, quality }),
      });

      const data = await response.json();

      if (data.status === "completed" && data.video_url) {
        setVideoUrl(data.video_url);
        setStatus("Completed");
        setIsLoading(false);
        toast.success("Video generated successfully!");
      } else if (data.fallback) {
        setIsFallback(true);
        setImageUrl(data.image_url);
        setStatus("Completed (Fallback to Pollinations)");
        setIsLoading(false);
        toast.success("Generated image via Pollinations (Fallback)");
      } else if (data.task_id) {
        setTaskId(data.task_id);
        setStatus("Processing on Google Vertex AI...");
      } else {
        throw new Error(data.error || "Failed to start generation");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred");
      setIsLoading(false);
      setStatus("Failed");
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (taskId && !videoUrl) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/veo/status?task_id=${encodeURIComponent(taskId)}`);
          const data = await response.json();

          if (data.status === "completed") {
            setVideoUrl(data.video_url);
            setStatus("Completed");
            setIsLoading(false);
            clearInterval(interval);
            toast.success("Video generation complete!");
          } else if (data.status === "failed") {
            setStatus("Failed: " + data.error);
            setIsLoading(false);
            clearInterval(interval);
            toast.error("Generation failed: " + data.error);
          } else {
            setStatus("Processing... (polling)");
          }
        } catch (error) {
          console.error("Status check error:", error);
        }
      }, 10000); // Poll every 10 seconds
    }

    return () => clearInterval(interval);
  }, [taskId, videoUrl]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <nav className="mb-8 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <Logo width={140} src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/index/base-logo.png" />
        </a>
        <div className="hidden md:block text-muted-foreground text-sm">
          Veo 3.1 Fast Video Generator
        </div>
      </nav>

      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-rainbow-rgb">
            Veo 3.1 Video Studio
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Create high-quality cinematic videos from text prompts using Google's latest Veo 3.1 Fast model.
          </p>
        </header>

        <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Generator Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Prompt</label>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-md bg-background border border-input focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Describe the video you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quality</label>
                <select 
                  className="w-full p-2 rounded-md bg-background border border-input outline-none"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                >
                  <option value="720p">720p (Fast)</option>
                  <option value="1080p">1080p (Standard)</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button 
                  className="w-full h-10 gap-2 font-bold"
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isLoading ? "Generating..." : "Generate Video"}
                </Button>
              </div>
            </div>

            {status && (
              <div className="mt-4 p-3 rounded-md bg-muted/50 flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  {isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  Status: {status}
                </span>
                {taskId && <span className="text-[10px] opacity-50 font-mono">ID: {taskId.split('/').pop()?.slice(0, 8)}...</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            {isFallback ? <ImageIcon className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            Result Preview
          </h3>
          
          <Card className="overflow-hidden aspect-video relative bg-black/20 flex items-center justify-center border-dashed border-2 border-primary/20">
            {videoUrl ? (
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-contain"
              />
            ) : imageUrl ? (
              <div className="relative w-full h-full">
                <img src={imageUrl} alt="Fallback" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                   <a href={imageUrl} target="_blank" className="btn btn-primary btn-sm gap-2">
                      <Download className="w-4 h-4" />
                      Download Image
                   </a>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 opacity-50">
                <Video className="w-12 h-12 mx-auto" />
                <p>Your generated content will appear here</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
