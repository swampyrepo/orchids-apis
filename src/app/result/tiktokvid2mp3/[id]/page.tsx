"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function TikTokResultPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setMp3Url(`/api/result/ttvid2mp3/${id}`);
      setLoading(false);
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
                <div className="btn btn-primary px-2 px-sm-4 px-lg-2 px-xl-4">
                  <span className="icon-base ri ri-user-line me-md-1 icon-18px"></span>
                  <span className="d-none d-md-block">Vallzx APIs Active</span>
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
          data-app-light-img="front-pages/backgrounds/hero-bg-light.png"
          data-app-dark-img="front-pages/backgrounds/hero-bg-dark.png"
        />

        <div className="container">
          <div className="hero-text-box text-center">
            <h1 className="text-rainbow-rgb fs-bold hero-title mb-4">TikTok MP3 Ready</h1>
            <h2 className="h6 mb-8 lh-md">
              Your conversion is complete. You can play or download the MP3 below.
            </h2>
            
            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : (
              <div className="card shadow-lg border-0 bg-transparent glass-effect p-6 mx-auto" style={{ maxWidth: "600px", backdropFilter: "blur(10px)", background: "rgba(255,255,255,0.1)" }}>
                <div className="card-body">
                  <div className="mb-6">
                    <i className="ri-music-2-line display-4 text-primary"></i>
                  </div>
                  <audio controls className="w-100 mb-6" src={mp3Url || ""}>
                    Your browser does not support the audio element.
                  </audio>
                  <div className="d-grid gap-3 d-sm-flex justify-content-center">
                    <a
                      href={mp3Url || ""}
                      download={`tiktok_${id}.mp3`}
                      className="btn btn-primary btn-lg px-6"
                    >
                      <i className="ri-download-2-line me-2"></i> Download MP3
                    </a>
                    <a href="/" className="btn btn-outline-secondary btn-lg px-6">
                      Back to Home
                    </a>
                  </div>
                </div>
              </div>
            )}
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
              <a href="https://vercel.com" target="_blank" className="footer-link text-body ms-1 d-inline-flex align-items-center">
                Vercel
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
