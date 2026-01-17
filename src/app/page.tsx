"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

export default function Home() {
  const router = useRouter();
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSuspicious, setIsSuspicious] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState({
    total_requests: "0",
    total_visitors: "0",
    total_success: "0",
    total_errors: "0",
    percentage_rate: "0",
  });

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // Check maintenance table
        const maintenanceRes = await fetch("/api/maintenance");
        const maintenanceData = await maintenanceRes.json();
        if (maintenanceData.enabled) {
          router.replace("/error/503");
          return;
        }

        // Check server_status table (from /server_control)
        const monitorRes = await fetch("/api/monitor");
        const monitorData = await monitorRes.json();
        if (monitorData.server?.is_down) {
          router.replace("/error/503");
          return;
        }
      } catch (e) {
        console.error("Error checking maintenance:", e);
      }
      setMaintenanceChecked(true);
    };
    checkMaintenance();
  }, [router]);

  useEffect(() => {
    if (!maintenanceChecked) return;
    const ua = navigator.userAgent.toLowerCase();
    const isBot = /bot|crawler|spider|crawling|headless|chrome-lighthouse|googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|ia_archiver/.test(ua);
    const isHeadless = navigator.webdriver || !navigator.languages || navigator.languages.length === 0;

    if (isBot || isHeadless) {
      setIsSuspicious(true);
    }

    const fetchInitialStats = async () => {
      try {
        let url = "/api/stats";
        const hasBeenCounted = localStorage.getItem("vreden_visitor_counted");
        if (!hasBeenCounted) {
          url += "?visitor=true";
          localStorage.setItem("vreden_visitor_counted", "true");
        }
        const response = await fetch(url);
        const data = await response.json();
        setStats({
          total_requests: data.total_hits || data.total_requests || "0",
          total_visitors: data.total_visitors || "0",
          total_success: data.total_success || "0",
          total_errors: data.total_errors || "0",
          percentage_rate: data.percentage_rate || "0",
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchInitialStats();

    const channel = supabaseClient
      .channel('homepage-stats')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'statistics',
          filter: 'id=eq.1'
        },
        (payload) => {
          const newData = payload.new as any;
          const totalSuccess = Number(newData.total_success || 0);
          const totalErrors = Number(newData.total_errors || 0);
          const total = totalSuccess + totalErrors;
          const percentageRate = total > 0 ? ((totalSuccess / total) * 100).toFixed(1) : "0";
          setStats({
            total_requests: String(newData.total_requests || 0),
            total_visitors: String(newData.total_visitors || 0),
            total_success: String(totalSuccess),
            total_errors: String(totalErrors),
            percentage_rate: percentageRate,
          });
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [maintenanceChecked]);

  useEffect(() => {
    if (isSuspicious && !isVerified) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [isSuspicious, isVerified]);

  useEffect(() => {
    const handleVerified = (e: any) => {
      setIsLoading(true);
      setTimeout(() => {
        setIsVerified(true);
        setIsLoading(false);
      }, 2000);
    };

    window.addEventListener('turnstile-verified', handleVerified);
    return () => window.removeEventListener('turnstile-verified', handleVerified);
  }, []);

  if (!maintenanceChecked) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b" }}>Memuat...</p>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .gist-dark {
            filter: invert(1) hue-rotate(180deg);
        }

        .gist .gist-meta {
            display: none;
        }

        .gist-file {
            border-radius: 16px !important;
            overflow: hidden !important;
        }

        .gist-data {
            border-radius: 16px !important;
        }

        .blob-wrapper {
            border-radius: 16px !important;
        }

        .text-rainbow-rgb {
            font-size: 4rem;
            font-weight: 900;
            background: linear-gradient(270deg, #12AE6F, #4361EE, #1D92F1);
            background-size: 2000% 2000%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: rainbowFlow 6s linear infinite;
        }

        @keyframes rainbowFlow {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
        }

        .loader {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: block;
          margin: 15px auto;
          position: relative;
          color: #000;
          box-sizing: border-box;
          animation: animloader 2s linear infinite;
        }

        @keyframes animloader {
          0% {
            box-shadow: 14px 0 0 -2px,  38px 0 0 -2px,  -14px 0 0 -2px,  -38px 0 0 -2px;
          }
          25% {
            box-shadow: 14px 0 0 -2px,  38px 0 0 -2px,  -14px 0 0 -2px,  -38px 0 0 2px;
          }
          50% {
            box-shadow: 14px 0 0 -2px,  38px 0 0 -2px,  -14px 0 0 2px,  -38px 0 0 -2px;
          }
          75% {
            box-shadow: 14px 0 0 2px,  38px 0 0 -2px,  -14px 0 0 -2px,  -38px 0 0 -2px;
          }
          100% {
            box-shadow: 14px 0 0 -2px,  38px 0 0 2px,  -14px 0 0 -2px,  -38px 0 0 -2px;
          }
        }
      `}} />

      {isSuspicious && !isVerified ? (
        <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-white">
          <img src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/index/base-logo.png" alt="Logo" width="150" className="mb-4" />
          
          <div className="card shadow-sm p-4 text-center" style={{ maxWidth: "400px", width: "90%" }}>
            <h5 className="mb-4">Verify you are human</h5>
            {isLoading ? (
              <span className="loader"></span>
            ) : (
              <div className="cf-turnstile" data-sitekey="1x00000000000000000000AA" data-callback="onTurnstileSuccess"></div>
            )}
          </div>

          <footer className="mt-4 text-muted">
            &copy; 2026 - Visora ID Teams
          </footer>

          <script dangerouslySetInnerHTML={{ __html: `
            function onTurnstileSuccess(token) {
              window.dispatchEvent(new CustomEvent('turnstile-verified', { detail: { token } }));
            }
          `}} />
        </div>
      ) : (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebAPI",
                "name": "Vallzx APIs",
                "description": "Vallzx API provides various JSON APIs for JavaScript applications including downloaders, social media tools, search functions, converters, and other utilities.",
                "documentation": "https://api.vreden.my.id/dashboard",
                "provider": {
                  "@type": "Organization",
                  "name": "Vallzx"
                }
              })
            }}
          />

          <nav className="layout-navbar shadow-none py-0">
            <div className="container">
              <div className="navbar navbar-expand-lg landing-navbar px-3 px-md-8">
                <div className="navbar-brand app-brand demo d-flex py-0 me-4 me-xl-6">
                  <a href="/" className="app-brand-link">
                    <span className="app-brand-logo demo">
                      <span style={{ color: "#9055FD" }}>
                        <img src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/index/base-logo.png" alt="Vallzx Official" width="105" />
                      </span>
                    </span>
                  </a>
                </div>
                <ul className="navbar-nav flex-row align-items-center ms-auto">
                  <li className="nav-item dropdown-style-switcher dropdown me-2 me-xl-0">
                    <a className="nav-link dropdown-toggle hide-arrow me-sm-2" id="nav-theme" href="javascript:void(0);" data-bs-toggle="dropdown">
                      <i className="icon-base ri ri-sun-line icon-24px theme-icon-active"></i>
                      <span className="d-none ms-2" id="nav-theme-text">Toggle theme</span>
                    </a>
                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="nav-theme-text">
                      <li>
                        <button type="button" className="dropdown-item align-items-center active" data-bs-theme-value="light">
                          <span> <i className="icon-base ri ri-sun-line icon-24px me-3"></i>Light</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="dropdown-item align-items-center" data-bs-theme-value="dark">
                          <span> <i className="icon-base ri ri-moon-clear-line icon-24px me-3"></i>Dark</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="dropdown-item align-items-center" data-bs-theme-value="system">
                          <span> <i className="icon-base ri ri-computer-line icon-24px me-3"></i>System</span>
                        </button>
                      </li>
                    </ul>
                  </li>
                  <li>
                    <a href="/dashboard" className="btn btn-primary px-2 px-sm-4 px-lg-2 px-xl-4">
                      <span className="icon-base ri ri-user-line me-md-1 icon-18px"></span>
                      <span className="d-none d-md-block">Login/Register</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </nav>

          <div className="scrollspy-example" data-bs-spy="scroll">
            <section id="landingHero" className="section-py landing-hero position-relative">
              <img src="https://api.vreden.my.id/assets/img/front-pages/backgrounds/hero-bg-light.png" alt="hero background" className="position-absolute top-0 start-0 w-100 h-100 z-n1" data-speed="1" data-app-light-img="front-pages/backgrounds/hero-bg-light.png" data-app-dark-img="front-pages/backgrounds/hero-bg-dark.png" />
              <div className="container">
                <div className="hero-text-box text-center">
                    <h3 className="text-rainbow-rgb fs-bold hero-title mb-4">Vallzx APIs</h3>
                    <h2 className="h6 mb-8 lh-md">Gratis dan mudah digunakan<br />akses semua situs scraper yang Anda perlukan.</h2>
                    <a href="/dashboard" className="btn btn-lg" style={{ height: "48px", background: "linear-gradient(to right, #4361EE, #1D92F1)", color: "white" }}>Go to Dashboard</a>
                  </div>
                <div className="position-relative hero-animation-img">
                  <a href="https://www.vreden.my.id" target="_blank">
                    <div className="hero-dashboard-img text-center">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/landing-page/hero-dashboard-light.png" alt="hero dashboard" className="animation-img" data-speed="2" data-app-light-img="front-pages/landing-page/hero-dashboard-light.png" data-app-dark-img="front-pages/landing-page/hero-dashboard-dark.png" />
                    </div>
                    <div className="position-absolute hero-elements-img">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/landing-page/hero-elements-light.png" alt="hero elements" className="animation-img" data-speed="4" data-app-light-img="front-pages/landing-page/hero-elements-light.png" data-app-dark-img="front-pages/landing-page/hero-elements-dark.png" />
                    </div>
                  </a>
                </div>
              </div>
            </section>

            <section id="landingFeatures" className="section-py landing-features">
              <div className="container">
                <h6 className="text-center d-flex justify-content-center align-items-center mb-6">
                  <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="section title icon" className="me-2" height="19" />
                  <span className="text-uppercase">Fitur Tersedia</span>
                </h6>
                <h5 className="text-center mb-2"><span className="h4 fw-bold">List fitur</span> yang kamu sediakan</h5>
                <p className="text-center fw-medium mb-4 mb-md-12">Gratis tanpa limit maupun login authorized.</p>
                <div className="features-icon-wrapper row gx-0 gy-12 gx-sm-6">
                  <div className="col-lg-4 col-sm-6 text-center features-icon-box">
                    <div className="features-icon mb-4">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/icons/terminal.svg" alt="Vallzx APIs" />
                    </div>
                    <h5 className="mb-2">Result Terbaik</h5>
                    <p className="features-icon-description">Response API berkualitas tinggi dan hampir tidak pernah mengalami error.</p>
                  </div>
                  <div className="col-lg-4 col-sm-6 text-center features-icon-box">
                    <div className="features-icon mb-4">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/icons/cpu.svg" alt="Vallzx APIs" />
                    </div>
                    <h5 className="mb-2">Kecerdasan Buatan</h5>
                    <p className="features-icon-description">Akses ke beberapa platform AI Chat maupun image generator secara free.</p>
                  </div>
                  <div className="col-lg-4 col-sm-6 text-center features-icon-box">
                    <div className="features-icon mb-4">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/icons/download-cloud.svg" alt="Vallzx APIs" />
                    </div>
                    <h5 className="mb-2">Download Media</h5>
                    <p className="features-icon-description">Downloader media sosial dengan kualitas terbaik tanpa delay maupun error.</p>
                  </div>
                  <div className="col-lg-4 col-sm-6 text-center features-icon-box">
                    <div className="features-icon mb-4">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/icons/award.svg" alt="Vallzx APIs" />
                    </div>
                    <h5 className="mb-2">API Terbaik</h5>
                    <p className="features-icon-description">Rest API Terbaik dengan catatan reputasi yang baik tanpa ada riwayat negatif dari users.</p>
                  </div>
                  <div className="col-lg-4 col-sm-6 text-center features-icon-box">
                    <div className="features-icon mb-4">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/icons/shield.svg" alt="Vallzx APIs" />
                    </div>
                    <h5 className="mb-2">Api Protected</h5>
                    <p className="features-icon-description">Di lindungi oleh keamanan tingkat tinggi dengan bantuan cloudflare anti down kecuali maintenance.</p>
                  </div>
                  <div className="col-lg-4 col-sm-6 text-center features-icon-box">
                    <div className="features-icon mb-4">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/icons/package.svg" alt="Vallzx APIs" />
                    </div>
                    <h5 className="mb-2">Premium Package</h5>
                    <p className="features-icon-description">Menggunakan beberapa package premium yang berbayar, tetapi users dapat menikmatinya secara gratis.</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="landingservice" className="section-py bg-body landing-reviews">
              <div className="container">
                <h6 className="text-center d-flex justify-content-center align-items-center mb-6">
                  <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="section title icon" className="me-2" height="19" />
                  <span className="text-uppercase">Aplikasi Didukung</span>
                </h6>
                <h5 className="text-center mb-2"><span className="h4 fw-bold">Apps populer</span> yang disediakan</h5>
                <p className="text-center fw-medium mb-4 mb-md-12">Paling dicari dan banyak digunakan.</p>
              </div>
              <div className="container">
                <div className="swiper-logo-carousel pt-lg-4 mt-12">
                  <div className="swiper" id="swiper-clients-logos">
                    <div className="swiper-wrapper">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div className="swiper-slide" key={i}>
                          <img src={`https://api.vreden.my.id/assets/img/front-pages/branding/logo-${i}-light.png`} alt="client logo" className="client-logo" data-app-light-img={`front-pages/branding/logo-${i}-light.png`} data-app-dark-img={`front-pages/branding/logo-${i}-dark.png`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="landingTeam" className="section-py landing-team">
              <div className="container bg-icon-right position-relative">
                <img src="https://api.vreden.my.id/assets/img/front-pages/icons/bg-right-icon-light.png" alt="section icon" className="position-absolute top-0 end-0" data-speed="1" data-app-light-img="https://api.vreden.my.id/assets/img/front-pages/icons/bg-right-icon-light.png" data-app-dark-img="https://api.vreden.my.id/assets/img/front-pages/icons/bg-right-icon-dark.png" />
                <h6 className="text-center d-flex justify-content-center align-items-center mb-6">
                  <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="section title icon" className="me-2" height="19" />
                  <span className="text-uppercase">Contoh Response</span>
                </h6>
                <h5 className="text-center mb-2">Nilai sendiri <span className="h4 fw-bold">kualitas</span> response</h5>
                <p className="text-center fw-medium mb-4 mb-md-12 pb-7">Apakah data ini gampang di olah?</p>
                <div className="row gy-lg-5 gy-12 mt-2">
                  <div className="col-lg-4 col-sm-6">
                    <p className="text-theme-adaptive">Contoh YouTube Audio:</p>
                    <div className="gist-dark">
                      <div dangerouslySetInnerHTML={{ __html: `<script src="https://gist.github.com/vreden/aba3d279ca18d23c42767f3559e44d07.js"></script>` }} />
                    </div>
                  </div>
                  <div className="col-lg-4 col-sm-6">
                    <p className="text-theme-adaptive">Contoh Spotify Audio:</p>
                    <div className="gist-dark">
                      <div dangerouslySetInnerHTML={{ __html: `<script src="https://gist.github.com/vreden/bfeb1c7a26d8d826090787797ae5fab0.js"></script>` }} />
                    </div>
                  </div>
                  <div className="col-lg-4 col-sm-6">
                    <p className="text-theme-adaptive">Contoh Google Drive:</p>
                    <div className="gist-dark">
                      <div dangerouslySetInnerHTML={{ __html: `<script src="https://gist.github.com/vreden/74026eba055817fe4394bd63a52132eb.js"></script>` }} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="landingPricing" className="section-py bg-body landing-pricing">
              <div className="container bg-icon-left position-relative">
                <img src="https://api.vreden.my.id/assets/img/front-pages/icons/bg-left-icon-light.png" alt="section icon" className="position-absolute top-0 start-0" data-speed="1" data-app-light-img="https://api.vreden.my.id/assets/img/front-pages/icons/bg-left-icon-light.png" data-app-dark-img="https://api.vreden.my.id/assets/img/front-pages/icons/bg-left-icon-dark.png" />
                <h6 className="text-center d-flex justify-content-center align-items-center mb-6">
                  <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="section title icon" className="me-2" height="19" />
                  <span className="text-uppercase">Layanan Lainnya</span>
                </h6>
                <h5 className="text-center mb-2"><span className="h4 fw-bold">Spesial</span> price jika Anda mau.</h5>
                <p className="text-center fw-medium mb-10 mb-md-12 pb-lg-4">
                  Plan layanan lain yang kami sediakan untukmu.
                </p>
                <div className="row gy-4 pt-lg-4">
                  <div className="col-xl-4 col-lg-6">
                    <div className="card shadow-none">
                      <div className="card-header border-0">
                        <h4 className="mb-3 text-center">Rest API</h4>
                        <div className="d-flex align-items-center">
                          <h5 className="d-flex mb-0"><sup className="h5 mt-4">$</sup><span className="display-3 fw-bold">0</span></h5>
                          <div className="ms-2 ps-1">
                            <h6 className="mb-1">Per month</h6>
                            <p className="small mb-0 text-body">Rest API ini gratis untuk semua orang.</p>
                          </div>
                        </div>
                        <img src="https://api.vreden.my.id/assets/img/front-pages/icons/smiling-icon.png" alt="smiling icon" />
                      </div>
                      <div className="card-body">
                        <ul className="list-unstyled">
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              5 RPS
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              ∞ RPD
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Rest API Terbaik 
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Dilengkapi Chat AI
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Image Generation AI
                            </h6>
                          </li>
                        </ul>
                        <hr />
                        <div className="d-flex justify-content-between align-items-center flex-wrap">
                          <div className="me-1">
                            <h6 className="mb-1">Tanpa biaya</h6>
                            <p className="small mb-0 text-body">Rest API public</p>
                          </div>
                          <span className="badge bg-label-primary rounded-pill">Tanpa Login</span>
                        </div>
                        <div className="text-center mt-6 pt-2">
                          <a href="/dashboard" className="btn btn-outline-primary w-100">Buka Dokumentasi</a>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-xl-4 col-lg-6">
                    <div className="card border-primary border-2 shadow-none">
                      <div className="card-header border-0">
                        <h4 className="mb-3 text-center">Virtual Number</h4>
                        <div className="d-flex align-items-center">
                          <h5 className="d-flex mb-0"><sup className="h5 mt-4">$</sup><span className="display-3 fw-bold">0.2</span></h5>
                          <div className="ms-2 ps-1">
                            <h6 className="mb-1">Per pcs</h6>
                            <p className="small mb-0 text-body">Virtual number untuk verifikasi.</p>
                          </div>
                        </div>
                        <img src="https://api.vreden.my.id/assets/img/front-pages/icons/smiling-icon.png" alt="smiling icon" />
                      </div>
                      <div className="card-body">
                        <ul className="list-unstyled">
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              180 Negara
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              1093 Aplikasi
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Code SMS Cepat
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Harga Terjangkau
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Keamanan Terjamin
                            </h6>
                          </li>
                        </ul>
                        <hr />
                        <div className="d-flex justify-content-between align-items-center flex-wrap">
                          <div className="me-1">
                            <h6 className="mb-1">Virtual Number</h6>
                            <p className="small mb-0 text-body">Beli nomor kosong</p>
                          </div>
                          <span className="badge bg-label-primary rounded-pill">Mitra Patner</span>
                        </div>
                        <div className="text-center mt-6 pt-2">
                          <a href="https://www.rumahotp.com" className="btn btn-primary w-100">Kunjungi Website</a>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-xl-4 col-lg-6">
                    <div className="card shadow-none">
                      <div className="card-header border-0">
                        <h4 className="mb-3 text-center">Github Source</h4>
                        <div className="d-flex align-items-center">
                          <h5 className="d-flex mb-0"><sup className="h5 mt-4">$</sup><span className="display-3 fw-bold">0</span></h5>
                          <div className="ms-2 ps-1">
                            <h6 className="mb-1">Per month</h6>
                            <p className="small mb-0 text-body">Public repository bebas download.</p>
                          </div>
                        </div>
                        <img src="https://api.vreden.my.id/assets/img/front-pages/icons/smiling-icon.png" alt="smiling icon" />
                      </div>
                      <div className="card-body">
                        <ul className="list-unstyled">
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              YouTube Scraper
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              WhatsApp Baileys
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Update Min 1x/bulan
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Bebas Download
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Bebas Recode
                            </h6>
                          </li>
                          <li>
                            <h6 className="mb-3">
                              <img src="https://api.vreden.my.id/assets/img/front-pages/icons/list-arrow-icon.png" alt="list arrow icon" className="me-2 pe-1 scaleX-n1-rtl" />
                              Mudah Dipahami
                            </h6>
                          </li>
                        </ul>
                        <hr />
                        <div className="d-flex justify-content-between align-items-center flex-wrap">
                          <div className="me-1">
                            <h6 className="mb-1">Repository Github</h6>
                            <p className="small mb-0 text-body">Source code gratis</p>
                          </div>
                          <span className="badge bg-label-primary rounded-pill">Bebas Recode</span>
                        </div>
                        <div className="text-center mt-6 pt-2">
                          <a href="https://github.com/vreden" className="btn btn-outline-primary w-100">Lihat Github</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="landingFunFacts" className="section-py landing-fun-facts py-12 my-4">
              <div className="container">
                <div className="row gx-0 gy-5 gx-sm-6">
                  <div className="col-lg-3 col-sm-6 text-center">
                    <span className="badge rounded-pill bg-label-primary bg-label-hover fun-facts-icon mb-6 p-5"><i className="icon-base ri ri-pie-chart-2-line icon-42px"></i></span>
                    <h2 className="fw-bold mb-0 fun-facts-text">{Number(stats.total_success) + Number(stats.total_errors)}</h2>
                    <h6 className="mb-0 text-body">Total Request</h6>
                  </div>
                  <div className="col-lg-3 col-sm-6 text-center">
                    <span className="badge rounded-pill bg-label-success bg-label-hover fun-facts-icon mb-6 p-5"><i className="icon-base ri ri-checkbox-circle-line icon-42px"></i></span>
                    <h2 className="fw-bold mb-0 fun-facts-text">{stats.total_success}</h2>
                    <h6 className="mb-0 text-body">Success</h6>
                  </div>
                  <div className="col-lg-3 col-sm-6 text-center">
                    <span className="badge rounded-pill bg-label-danger bg-label-hover fun-facts-icon mb-6 p-5"><i className="icon-base ri ri-bug-line icon-42px"></i></span>
                    <h2 className="fw-bold mb-0 fun-facts-text">{stats.total_errors}</h2>
                    <h6 className="mb-0 text-body">Failed</h6>
                  </div>
                  <div className="col-lg-3 col-sm-6 text-center">
                    <span className="badge rounded-pill bg-label-info bg-label-hover fun-facts-icon mb-6 p-5"><i className="icon-base ri ri-percent-line icon-42px"></i></span>
                    <h2 className="fw-bold mb-0 fun-facts-text">{stats.percentage_rate}%</h2>
                    <h6 className="mb-0 text-body">Success Rate</h6>
                  </div>
                </div>
              </div>
            </section>

            <section id="landingFAQ" className="section-py bg-body landing-faq">
              <div className="container bg-icon-right">
                <img src="https://api.vreden.my.id/assets/img/front-pages/icons/bg-right-icon-light.png" alt="section icon" className="position-absolute top-0 end-0" data-speed="1" data-app-light-img="https://api.vreden.my.id/assets/img/front-pages/icons/bg-right-icon-light.png" data-app-dark-img="https://api.vreden.my.id/assets/img/front-pages/icons/bg-right-icon-dark.png" />
                <h6 className="text-center d-flex justify-content-center align-items-center mb-6">
                  <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="section title icon" className="me-2" height="19" />
                  <span className="text-uppercase">Pertanyaan Umum</span>
                </h6>
                <h5 className="text-center mb-2">Pertanyaan yang sering<span className="h4 fw-bold"> diajukan</span></h5>
                <p className="text-center fw-medium mb-4 mb-md-12 pb-4">Cari sesuatu yang Anda ingin tanyakan.</p>
                <div className="row gy-5">
                  <div className="col-lg-5">
                    <div className="text-center">
                      <img src="https://api.vreden.my.id/assets/img/front-pages/landing-page/sitting-girl-with-laptop.png" alt="sitting girl with laptop" className="faq-image scaleX-n1-rtl" />
                    </div>
                  </div>
                  <div className="col-lg-7">
                    <div className="accordion" id="accordionFront">
                      <div className="accordion-item">
                        <h2 className="accordion-header" id="head-One">
                          <button type="button" className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#accordionOne">Apakah Rest API ini gratis?</button>
                        </h2>
                        <div id="accordionOne" className="accordion-collapse collapse" data-bs-parent="#accordionFront">
                          <div className="accordion-body">Gratis di pake buat project skala kecil hingga menengah yang membutuhkan limit request banyak.</div>
                        </div>
                      </div>
                      <div className="accordion-item previous-active">
                        <h2 className="accordion-header" id="head-Two">
                          <button type="button" className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#accordionTwo">Domain selalu aktif atau bakal expired?</button>
                        </h2>
                        <div id="accordionTwo" className="accordion-collapse collapse" data-bs-parent="#accordionFront">
                          <div className="accordion-body">Domain selalu aktif selagi sponsor kami masih bekerja sama dengan rest api untuk selalu perpanjangan masa expired.</div>
                        </div>
                      </div>
                      <div className="accordion-item active">
                        <h2 className="accordion-header" id="head-Three">
                          <button type="button" className="accordion-button" data-bs-toggle="collapse" data-bs-target="#accordionThree">Web down, saya harus panik atau tenang saja?</button>
                        </h2>
                        <div id="accordionThree" className="accordion-collapse collapse show" data-bs-parent="#accordionFront">
                          <div className="accordion-body">
                            Website ini hanya mati ketika ada maintenance atau pembaruan, info selengkapnya bisa di baca di channel WhatsApp.
                          </div>
                        </div>
                      </div>
                      <div className="accordion-item">
                        <h2 className="accordion-header" id="head-Four">
                          <button type="button" className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#accordionFour">Apakah rest api ini boleh dijual?</button>
                        </h2>
                        <div id="accordionFour" className="accordion-collapse collapse" data-bs-parent="#accordionFront">
                          <div className="accordion-body">Gak.</div>
                        </div>
                      </div>
                      <div className="accordion-item">
                        <h2 className="accordion-header" id="head-Five">
                          <button type="button" className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#accordionFive">Apa yang terjadi jika tidak sengaja spam?</button>
                        </h2>
                        <div id="accordionFive" className="accordion-collapse collapse" data-bs-parent="#accordionFront">
                          <div className="accordion-body">Cloudflare akan aktif secara otomatis and alamat IP Anda akan diblokir!</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="landingCTA" className="section-py landing-cta p-lg-0 pb-0 position-relative">
              <img src="https://api.vreden.my.id/assets/img/front-pages/backgrounds/cta-bg-light.png" className="position-absolute bottom-0 end-0 scaleX-n1-rtl h-100 w-100 z-n1" alt="cta image" data-speed="1" data-app-light-img="https://api.vreden.my.id/assets/img/front-pages/backgrounds/cta-bg-light.png" data-app-dark-img="https://api.vreden.my.id/assets/img/front-pages/backgrounds/cta-bg-dark.png" />
              <div className="container">
                <div className="row align-items-center gy-5 gy-lg-0">
                  <div className="col-lg-6 text-center text-lg-start">
                    <h2 className="display-5 text-primary fw-bold mb-0">Siap untuk memulai?</h2>
                    <p className="fw-medium mb-6 mb-md-8">Buat project kamu dengan Vallzx APIs</p>
                    <a href="/dashboard" className="btn btn-lg" style={{ height: "48px", background: "linear-gradient(to right, #4361EE, #1D92F1)", color: "white" }}>Go to Dashboard</a>
                  </div>
                  <div className="col-lg-6 pt-lg-12">
                    <img src="https://api.vreden.my.id/assets/img/front-pages/landing-page/cta-dashboard.png" alt="cta dashboard" className="img-fluid" />
                  </div>
                </div>
              </div>
            </section>

            <section id="landingContact" className="section-py bg-body landing-contact">
              <div className="container bg-icon-left position-relative">
                <img src="https://api.vreden.my.id/assets/img/front-pages/icons/bg-left-icon-light.png" alt="section icon" className="position-absolute top-0 start-0" data-speed="1" data-app-light-img="https://api.vreden.my.id/assets/img/front-pages/icons/bg-left-icon-light.png" data-app-dark-img="https://api.vreden.my.id/assets/img/front-pages/icons/bg-left-icon-dark.png" />
                <h6 className="text-center d-flex justify-content-center align-items-center mb-6">
                  <img src="https://api.vreden.my.id/assets/img/front-pages/icons/section-title-icon.png" alt="section title icon" className="me-2" height="19" />
                  <span className="text-uppercase">Hubungi Kami</span>
                </h6>
                <h5 className="text-center mb-2"><span className="h4 fw-bold">Request</span> ke developer team.</h5>
                <p className="text-center fw-medium mb-4 mb-md-12 pb-3">Punya pertanyaan lebih lanjut? tulis saja pesannya.</p>
                <div className="row gy-4">
                  <div className="col-12">
                    <div className="card">
                      <div className="card-body">
                        <h5 className="mb-6">Share your ideas</h5>
                        <form onSubmit={(e) => e.preventDefault()}>
                          <div className="row g-5">
                            <div className="col-md-6">
                              <div className="form-floating form-floating-outline">
                                <input type="text" className="form-control" id="basic-default-fullname" placeholder="Vallzx" />
                                <label htmlFor="basic-default-fullname">Full name</label>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="form-floating form-floating-outline">
                                <input type="email" className="form-control" id="basic-default-email" placeholder="vallzx@gmail.com" />
                                <label htmlFor="basic-default-email">Email address</label>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="form-floating form-floating-outline">
                                <textarea className="form-control h-px-200" placeholder="Message" id="basic-default-message"></textarea>
                                <label htmlFor="basic-default-message">Message</label>
                              </div>
                            </div>
                          </div>
                          <button type="submit" className="btn btn-primary mt-5">Send request</button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <footer className="landing-footer">
            <div className="footer-top position-relative overflow-hidden">
              <img src="https://api.vreden.my.id/assets/img/front-pages/backgrounds/footer-bg.png" alt="footer bg" className="footer-bg banner-bg-img" />
              <div className="container">
                <div className="row gx-0 gy-6 g-lg-10">
                  <div className="col-lg-5">
                    <a href="/dashboard" className="app-brand-link mb-6">
                      <span className="app-brand-logo demo">
                        <span style={{ color: "#9055FD" }}>
                          <img src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/index/base-logo.png" alt="Vallzx Official" width="105" />
                        </span>
                      </span>
                    </a>
                    <p className="footer-text footer-logo-description mb-6">Gratis dan mudah digunakan, akses semua situs scraper yang Anda perlukan. Website ini dibuat dan di kembangkan oleh Vallzx.</p>
                    <form className="footer-form" onSubmit={(e) => e.preventDefault()}>
                      <div className="d-flex mt-2 gap-4">
                        <div className="form-floating form-floating-outline w-px-250">
                          <input type="text" className="form-control bg-transparent" id="newsletter-1" placeholder="Your email" />
                          <label htmlFor="newsletter-1">Subscribe to newsletter</label>
                        </div>
                        <button type="submit" className="btn btn-primary">Subscribe</button>
                      </div>
                    </form>
                  </div>
                  <div className="col-lg-2 col-md-4 col-sm-6">
                    <h6 className="footer-title mb-4 mb-lg-6">About</h6>
                    <ul className="list-unstyled mb-0">
                      <li className="mb-4">
                        <a href="/company" target="_blank" className="footer-link">Company</a>
                      </li>
                      <li className="mb-4">
                        <a href="https://github.com/vreden" target="_blank" className="footer-link">Github</a>
                      </li>
                    </ul>
                  </div>
                  <div className="col-lg-2 col-md-4 col-sm-6">
                    <h6 className="footer-title mb-4 mb-lg-6">Channel</h6>
                    <ul className="list-unstyled mb-0">
                      <li className="mb-4">
                        <a href="https://whatsapp.com/channel/0029Vaf0HPMLdQeZsp3XRp2T" className="footer-link">WhatsApp</a>
                      </li>
                      <li className="mb-4">
                        <a href="https://chat.whatsapp.com/LBrMbidvSTqGyMd2UJ5o8F" className="footer-link">Group</a>
                      </li>
                    </ul>
                  </div>
                  <div className="col-lg-2 col-md-4 col-sm-6">
                    <h6 className="footer-title mb-4 mb-lg-6">Contact Us</h6>
                    <ul className="list-unstyled mb-0">
                      <li className="mb-4">
                        <a href="https://wa.me/6285643115199" className="footer-link">WhatsApp</a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="footer-bottom py-5 bg-transparent">
              <div className="container d-flex flex-wrap justify-content-between flex-md-row flex-column text-center text-md-start">
                <div className="mb-1 mb-md-0">
                  <div className="mb-2 mb-md-0"> © {new Date().getFullYear()} • Build on{" "}
                    <span className="text-body"><i className="icon-base tf-icons ri ri-cloud-line"></i></span>
                    <a href="/" target="_blank" className="footer-link text-body">Vallzx APIs</a>
                  </div>
                </div>
                <span className="mb-2 fs-tiny">Vallzx API Services</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </>
  );
}
