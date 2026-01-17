"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { Logo } from "@/components/Logo";

const ELEVENLABS_VOICES = [
  { id: "iWydkXKoiVtvdn4vLKp9", name: "Grace", provider: "ElevenLabs" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", provider: "ElevenLabs" },
  { id: "21m00T838D4w3n5H862r", name: "Rachel", provider: "ElevenLabs" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", provider: "ElevenLabs" },
  { id: "AZnzlk1Xidjqn8YiyMoc", name: "Antoni", provider: "ElevenLabs" },
  { id: "MF3mGyEYCl7XYW7Lec6G", name: "Elli", provider: "ElevenLabs" },
  { id: "Lcf7733DP7tgfcNNu9Y4", name: "Liam", provider: "ElevenLabs" },
];

const CUSTOM_VOICES = [
  { id: "prabowo-subianto", name: "Prabowo Subianto", provider: "VSID TTS Custom Voice" },
];

export default function TTSGeneratorPage() {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_VOICES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.className = "layout-navbar-fixed layout-menu-fixed layout-compact";
    html.setAttribute("data-template", "vertical-menu-template");
    html.setAttribute("data-assets-path", "https://api.vreden.my.id/assets/");

    return () => {
      html.className = "layout-navbar-fixed layout-wide";
      html.setAttribute("data-template", "front-pages");
    };
  }, []);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Please enter some text");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);

    try {
      let url = "";
      if (selectedVoice.provider === "ElevenLabs") {
        url = `/api/tools/text-to-speech?text=${encodeURIComponent(text)}&speaking-id=${selectedVoice.id}`;
      } else {
        url = `/api/text-to-speech/v2?text=${encodeURIComponent(text)}&voice=${selectedVoice.id}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate speech");
      }

      const blob = await response.blob();
      const urlObject = URL.createObjectURL(blob);
      setAudioUrl(urlObject);
      
      // Auto-play
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        .tts-container {
          max-width: 900px;
          margin: 0 auto;
        }
        .voice-card {
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .voice-card:hover {
          background: rgba(255,255,255,0.05);
          transform: translateY(-2px);
        }
        .voice-card.selected {
          border-color: #666cff;
          background: rgba(102, 108, 255, 0.1);
        }
        .elevenlabs-style-bg {
          background-color: #0b0f19;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .text-input-area {
          background: #161b26;
          border: 1px solid #2d3446;
          color: white;
          border-radius: 8px;
          padding: 1rem;
          width: 100%;
          min-height: 200px;
          resize: vertical;
          font-size: 1.1rem;
        }
        .text-input-area:focus {
          outline: none;
          border-color: #666cff;
        }
        .generate-btn {
          background: linear-gradient(135deg, #666cff 0%, #a632ff 100%);
          border: none;
          padding: 0.8rem 2rem;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .generate-btn:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 0 20px rgba(102, 108, 255, 0.4);
        }
        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .voice-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
      `}</style>

      {/* External CSS Assets */}
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/fonts/iconify-icons.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/node-waves/node-waves.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/css/core.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/css/demo.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.css" />

      {/* Scripts */}
      <Script src="https://api.vreden.my.id/assets/vendor/js/helpers.js" strategy="beforeInteractive" />
      <Script src="/js/customizer.js" strategy="beforeInteractive" />
      <Script src="https://api.vreden.my.id/assets/js/config.js" strategy="beforeInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/libs/jquery/jquery.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/libs/popper/popper.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/js/bootstrap.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/libs/node-waves/node-waves.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/vendor/js/menu.js" strategy="afterInteractive" />
      <Script src="https://api.vreden.my.id/assets/js/main.js" strategy="afterInteractive" />

      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
            <div className="app-brand demo">
              <a href="/" className="app-brand-link">
                <span className="app-brand-logo demo me-1">
                  <Logo width={150} src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png" />
                </span>
              </a>
              <a href="javascript:void(0);" className="layout-menu-toggle menu-link text-large ms-auto">
                <i className="menu-toggle-icon d-xl-block align-middle"></i>
              </a>
            </div>
            <div className="menu-inner-shadow"></div>
            <ul className="menu-inner py-1">
                <li className="menu-item">
                  <a href="/dashboard" className="menu-link">
                    <i className="menu-icon tf-icons ri ri-home-smile-line"></i>
                    <div>Back to Dashboard</div>
                  </a>
                </li>
              <li className="menu-header mt-7">
                <span className="menu-header-text">Generators</span>
              </li>
              <li className="menu-item active">
                <a href="/tts-generator" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-mic-line"></i>
                  <div>TTS Generator</div>
                </a>
              </li>
            </ul>
          </aside>

          <div className="layout-page">
            <nav className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme" id="layout-navbar">
              <div className="layout-menu-toggle navbar-nav align-items-xl-center me-4 me-xl-0 d-xl-none">
                <a className="nav-item nav-link px-0 me-xl-6" href="javascript:void(0)">
                  <i className="icon-base ri ri-menu-line icon-md"></i>
                </a>
              </div>
              <div className="navbar-nav-right d-flex align-items-center justify-content-end">
                <Logo width={50} src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png" />
              </div>
            </nav>

            <div className="content-wrapper">
              <div className="container-xxl flex-grow-1 container-p-y">
                <div className="tts-container">
                  <div className="text-center mb-8">
                    <h2 className="display-6 fw-bold mb-2">Speech Synthesis</h2>
                    <p className="text-secondary">Convert your text into high-quality spoken audio in seconds.</p>
                  </div>

                  <div className="elevenlabs-style-bg">
                    <h5 className="mb-4 text-white">Select a Voice</h5>
                    <div className="voice-grid">
                      {CUSTOM_VOICES.map((voice) => (
                        <div
                          key={voice.id}
                          className={`card voice-card p-3 ${selectedVoice.id === voice.id ? "selected" : ""}`}
                          onClick={() => setSelectedVoice(voice)}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <div className="avatar avatar-sm bg-label-primary rounded">
                              <i className="ri-user-voice-line"></i>
                            </div>
                            <div>
                              <h6 className="mb-0 text-white">{voice.name}</h6>
                              <small className="text-primary fs-tiny">{voice.provider}</small>
                            </div>
                          </div>
                        </div>
                      ))}
                      {ELEVENLABS_VOICES.map((voice) => (
                        <div
                          key={voice.id}
                          className={`card voice-card p-3 ${selectedVoice.id === voice.id ? "selected" : ""}`}
                          onClick={() => setSelectedVoice(voice)}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <div className="avatar avatar-sm bg-label-secondary rounded">
                              <i className="ri-mic-line"></i>
                            </div>
                            <div>
                              <h6 className="mb-0 text-white">{voice.name}</h6>
                              <small className="text-muted fs-tiny">{voice.provider}</small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <h5 className="mb-4 text-white">Enter Text</h5>
                    <textarea
                      className="text-input-area mb-4"
                      placeholder="Type or paste your text here..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={2000}
                    ></textarea>

                    <div className="d-flex justify-content-between align-items-center">
                      <div className="text-muted small">
                        {text.length} / 2000 characters
                      </div>
                      <button
                        className="generate-btn"
                        onClick={handleGenerate}
                        disabled={isGenerating || !text.trim()}
                      >
                        {isGenerating ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Generating...
                          </>
                        ) : (
                          <>
                            <i className="ri-play-fill me-2"></i>
                            Generate Speech
                          </>
                        )}
                      </button>
                    </div>

                    {error && (
                      <div className="alert alert-danger mt-4" role="alert">
                        <i className="ri-error-warning-line me-2"></i>
                        {error}
                      </div>
                    )}

                    {audioUrl && (
                      <div className="mt-6 p-4 rounded bg-dark border border-secondary">
                        <h6 className="text-white mb-3">Generated Audio</h6>
                        <audio ref={audioRef} controls src={audioUrl} className="w-100" />
                        <div className="mt-3 text-end">
                          <a href={audioUrl} download={`${selectedVoice.name}-speech.mp3`} className="btn btn-sm btn-outline-primary">
                            <i className="ri-download-line me-1"></i> Download MP3
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
