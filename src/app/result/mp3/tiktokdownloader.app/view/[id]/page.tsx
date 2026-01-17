import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import TikTokMP3ResultClient from "./TikTokMP3ResultClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getTikTokData(id: string) {
  const { data, error } = await supabase
    .from("tiktok_downloads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getTikTokData(id);

  if (!data) {
    return {
      title: "Audio Not Found - Vallzx APIs",
      description: "The requested audio could not be found.",
    };
  }

  const title = data.title || "TikTok Audio";
  const author = data.author || "Unknown";
  const thumbnail = data.thumbnail_url || "https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png";

  return {
    title: `${title} - TikTok MP3 Download | Vallzx APIs`,
    description: `Download TikTok audio by ${author}. ${title}`,
    openGraph: {
      title: `${title} - TikTok MP3 Download`,
      description: `Download TikTok audio by ${author}`,
      type: "music.song",
      images: [
        {
          url: thumbnail,
          width: 720,
          height: 1280,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - TikTok MP3 Download`,
      description: `Download TikTok audio by ${author}`,
      images: [thumbnail],
    },
  };
}

export default async function TikTokMP3ResultPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getTikTokData(id);

  return <TikTokMP3ResultClient id={id} data={data} />;
}
