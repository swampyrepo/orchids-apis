"use client";

import { Logo } from "@/components/Logo";

interface TikTokData {
  id: string;
  title?: string;
  author?: string;
  thumbnail_url?: string;
  mp4_path?: string;
  mp3_path?: string;
}

interface Props {
  id: string;
  data: TikTokData | null;
}

export default function TikTokMP3ResultClient({ id, data }: Props) {
  const mp3Url = `/api/result/mp4tiktok/${id}?type=mp3`;
  const title = data?.title || "TikTok Audio";
  const author = data?.author || "Unknown";

  if (!data || !data.mp3_path) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100">
        <h1 className="text-danger mb-4">Audio Not Found</h1>
        <p className="text-muted mb-4">The requested audio could not be found or has expired.</p>
        <a href="/" className="btn btn-primary">Back to Home</a>
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
            <h1 className="text-rainbow-rgb fs-bold hero-title mb-2">TikTok MP3 Downloader</h1>
            <p className="text-muted mb-2">{title}</p>
            <p className="text-muted small mb-6">by @{author}</p>
            
            <div className="row justify-content-center">
              <div className="col-lg-6">
                <div className="card shadow-lg border-0 bg-transparent glass-effect p-4" style={{ backdropFilter: "blur(10px)", background: "rgba(255,255,255,0.1)" }}>
                  <div className="card-body d-flex flex-column">
                    <h4 className="mb-4 text-success"><i className="ri-music-2-line me-2"></i>Audio (MP3)</h4>
                    
                    {data.thumbnail_url && (
                      <div className="mb-4 text-center">
                        <img 
                          src={data.thumbnail_url} 
                          alt={title}
                          className="rounded shadow"
                          style={{ maxWidth: "200px", maxHeight: "200px", objectFit: "cover" }}
                        />
                      </div>
                    )}
                    
                    <audio controls className="w-100 mb-6" src={mp3Url}>
                      Your browser does not support the audio element.
                    </audio>
                    <a
                      href={mp3Url}
                      download={`tiktok_${id}.mp3`}
                      className="btn btn-success btn-lg w-100 mt-auto"
                      style={{ backgroundColor: "#28a745", borderColor: "#28a745" }}
                    >
                      <i className="ri-download-2-line me-2"></i> Download MP3
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
               <a href="/" className="btn btn-outline-secondary btn-lg px-8">
                  Back to Home
               </a>
            </div>
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

      <style jsx>{`
        .glass-effect {
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
        }
        .text-rainbow-rgb {
          background: linear-gradient(to right, #6a11cb 0%, #2575fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
}
