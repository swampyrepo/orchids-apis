"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/Logo";

interface YTDownloadData {
  id: string;
  youtube_url: string;
  title: string;
  author: string;
  thumbnail_url: string;
  type: string;
  mp3_url?: string;
}

export default function YTDownloaderResultPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<YTDownloadData | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/result/ytdownloader/${id}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.status) {
            setData(res.result);
          } else {
            setError(res.error || "Failed to load data");
          }
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="scrollspy-example" data-bs-spy="scroll">
      <style dangerouslySetInnerHTML={{ __html: `
        .text-rainbow-rgb {
          font-size: 2.5rem;
          font-weight: 900;
          background: linear-gradient(270deg, #FF0000, #FF4444, #CC0000);
          background-size: 2000% 2000%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: rainbowFlow 6s linear infinite;
        }
        @keyframes rainbowFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .glass-effect {
          backdrop-filter: blur(10px);
          background: rgba(255,255,255,0.9) !important;
          border-radius: 16px;
        }
        .thumbnail-wrapper {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          max-width: 400px;
          margin: 0 auto;
        }
        .thumbnail-wrapper img {
          width: 100%;
          height: auto;
          object-fit: cover;
        }
      `}} />

      <nav className="layout-navbar shadow-none py-0">
        <div className="container">
          <div className="navbar navbar-expand-lg landing-navbar px-3 px-md-8">
            <div className="navbar-brand app-brand demo d-flex py-0 me-4 me-xl-6">
              <a href="/" className="app-brand-link">
                <span className="app-brand-logo demo">
                  <Logo width={160} src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/index/base-logo.png" />
                </span>
              </a>
            </div>
            <ul className="navbar-nav flex-row align-items-center ms-auto">
              <li>
                <div className="btn btn-danger px-2 px-sm-4 px-lg-2 px-xl-4">
                  <span className="icon-base ri ri-youtube-line me-md-1 icon-18px"></span>
                  <span className="d-none d-md-block">YouTube Downloader</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <section id="landingHero" className="section-py landing-hero position-relative">
        <img
          src="https://api.vreden.my.id/assets/img/front-pages/backgrounds/hero-bg-light.png"
          alt="hero background"
          className="position-absolute top-0 start-0 w-100 h-100 z-n1"
        />

        <div className="container">
          <div className="hero-text-box text-center">
            <h1 className="text-rainbow-rgb fs-bold hero-title mb-4">YouTube MP3 Ready</h1>
            <h2 className="h6 mb-8 lh-md">
              Your audio is ready. Play or download below.
            </h2>
            
            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : data ? (
              <div className="card shadow-lg border-0 glass-effect p-4 mx-auto" style={{ maxWidth: "600px" }}>
                <div className="card-body">
                  {data.thumbnail_url && (
                    <div className="thumbnail-wrapper mb-4">
                      <img src={data.thumbnail_url} alt={data.title} />
                    </div>
                  )}
                  
                  <h5 className="mb-2 text-dark">{data.title}</h5>
                  <p className="text-muted mb-4">{data.author}</p>
                  
                  <div className="mb-4">
                    <audio controls className="w-100" src={data.mp3_url || ""}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  
                  <div className="d-grid gap-3 d-sm-flex justify-content-center">
                    <a
                      href={data.mp3_url || ""}
                      download={`youtube_${id}.mp3`}
                      className="btn btn-danger btn-lg px-6"
                    >
                      <i className="ri-download-2-line me-2"></i> Download MP3
                    </a>
                    <a href="/" className="btn btn-outline-secondary btn-lg px-6">
                      Back to Home
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="landing-footer mt-auto">
        <div className="footer-bottom py-5 bg-transparent">
          <div className="container d-flex flex-wrap justify-content-between flex-md-row flex-column text-center text-md-start">
            <div className="mb-1 mb-md-0">
              © {new Date().getFullYear()} • Build on{" "}
              <span className="text-body">
                <i className="icon-base tf-icons ri ri-cloud-line"></i>
              </span>
              <a href="/" className="footer-link text-body ms-1">
                Vallzx APIs
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
