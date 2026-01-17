import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import TikTokResultClient from "./TikTokResultClient";

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
      title: "Video Not Found - Vallzx APIs",
      description: "The requested video could not be found.",
    };
  }

  const title = data.title || "TikTok Video";
  const author = data.author || "Unknown";
  const thumbnail = data.thumbnail_url || "https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png";

  return {
    title: `${title} - TikTok Download | Vallzx APIs`,
    description: `Download TikTok video by ${author}. ${title}`,
    openGraph: {
      title: `${title} - TikTok Download`,
      description: `Download TikTok video by ${author}`,
      type: "video.other",
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
      title: `${title} - TikTok Download`,
      description: `Download TikTok video by ${author}`,
      images: [thumbnail],
    },
  };
}

export default async function TikTokResultPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getTikTokData(id);

  return <TikTokResultClient id={id} data={data} />;
}
