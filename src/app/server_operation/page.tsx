"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Logo } from "@/components/Logo";
import { supabaseClient } from "@/lib/supabase-client";

interface ServerStatus {
  is_down: boolean;
  down_reason: string | null;
  memory_used_gb: number;
  memory_total_gb: number;
  cpu_usage_percent: number;
  updated_at: string;
}

export default function ServerOperationPage() {
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    is_down: false,
    down_reason: null,
    memory_used_gb: 9.95,
    memory_total_gb: 125.55,
    cpu_usage_percent: 8,
    updated_at: new Date().toISOString(),
  });
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const html = document.documentElement;
    html.className = "layout-navbar-fixed layout-menu-fixed layout-compact";
    html.setAttribute("data-template", "vertical-menu-template");
    html.setAttribute("data-assets-path", "https://api.vreden.my.id/assets/");

    const fetchServerStatus = async () => {
      try {
        const response = await fetch("/api/monitor");
        const data = await response.json();
        if (data.server) {
          setServerStatus({
            is_down: data.server.is_down || false,
            down_reason: data.server.down_reason,
            memory_used_gb: parseFloat(data.server.memory_used_gb) || 9.95,
            memory_total_gb: parseFloat(data.server.memory_total_gb) || 125.55,
            cpu_usage_percent: data.server.cpu_usage_percent || 8,
            updated_at: data.server.updated_at || new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Error fetching server status:", error);
      }
    };

    fetchServerStatus();

    const channel = supabaseClient
      .channel('server-status-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'server_status',
          filter: 'id=eq.1'
        },
        (payload) => {
          const newData = payload.new as any;
          setServerStatus({
            is_down: newData.is_down || false,
            down_reason: newData.down_reason,
            memory_used_gb: parseFloat(newData.memory_used_gb) || 9.95,
            memory_total_gb: parseFloat(newData.memory_total_gb) || 125.55,
            cpu_usage_percent: newData.cpu_usage_percent || 8,
            updated_at: newData.updated_at || new Date().toISOString(),
          });
        }
      )
      .on('system', {}, (status) => {
        if (status === 'ok') {
          setRealtimeStatus('connected');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      supabaseClient.removeChannel(channel);
      html.className = "layout-navbar-fixed layout-wide";
      html.setAttribute("data-template", "front-pages");
    };
  }, []);

  const memoryUsagePercent = ((serverStatus.memory_used_gb / serverStatus.memory_total_gb) * 100).toFixed(1);

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(29, 114, 243, 0.4); }
          50% { box-shadow: 0 0 40px rgba(29, 114, 243, 0.8); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .server-card {
          background: linear-gradient(135deg, rgba(29, 114, 243, 0.1) 0%, rgba(144, 85, 253, 0.1) 100%);
          border: 1px solid rgba(29, 114, 243, 0.2);
          transition: all 0.3s ease;
        }
        .server-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 40px rgba(29, 114, 243, 0.2);
        }
        .stat-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          font-size: 24px;
        }
        .progress-animated {
          transition: width 0.5s ease-in-out;
        }
        .server-status-badge {
          animation: pulse 2s infinite;
        }
        .server-icon {
          animation: float 3s ease-in-out infinite;
        }
        .spec-item {
          padding: 16px;
          border-radius: 12px;
          background: rgba(0,0,0,0.02);
          margin-bottom: 12px;
          transition: all 0.3s ease;
        }
        .spec-item:hover {
          background: rgba(29, 114, 243, 0.05);
        }
        [data-bs-theme="dark"] .spec-item {
          background: rgba(255,255,255,0.02);
        }
        [data-bs-theme="dark"] .spec-item:hover {
          background: rgba(29, 114, 243, 0.1);
        }
      `}</style>

      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/fonts/iconify-icons.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/node-waves/node-waves.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/pickr/pickr-themes.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/css/core.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/css/demo.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.css" />

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
      <Script id="theme-switcher" strategy="afterInteractive">{`
        (function() {
          function setTheme(theme) {
            var html = document.documentElement;
            var activeTheme = theme;
            if (theme === 'system') {
              activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            html.setAttribute('data-bs-theme', activeTheme);
            localStorage.setItem('theme', theme);
            document.querySelectorAll('[data-bs-theme-value]').forEach(function(btn) {
              btn.classList.remove('active');
              if (btn.getAttribute('data-bs-theme-value') === theme) {
                btn.classList.add('active');
              }
            });
          }
          var savedTheme = localStorage.getItem('theme') || 'light';
          setTheme(savedTheme);
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (localStorage.getItem('theme') === 'system') {
              setTheme('system');
            }
          });
          document.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-bs-theme-value]');
            if (btn) {
              var theme = btn.getAttribute('data-bs-theme-value');
              setTheme(theme);
            }
          });
        })();
      `}</Script>

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
                <a href="/" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-home-smile-line"></i>
                  <div>Homepage</div>
                </a>
              </li>
              <li className="menu-item">
                <a href="/dashboard" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-dashboard-line"></i>
                  <div>Dashboard</div>
                </a>
              </li>
              <li className="menu-header mt-7">
                <span className="menu-header-text">Server</span>
              </li>
              <li className="menu-item active">
                <a href="/server_operation" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-server-line"></i>
                  <div>Server Operation</div>
                </a>
              </li>
            </ul>
          </aside>

          <div className="menu-mobile-toggler d-xl-none rounded-1">
            <a href="javascript:void(0);" className="layout-menu-toggle menu-link text-large text-bg-secondary p-2 rounded-1">
              <i className="ri ri-menu-line icon-base"></i>
              <i className="ri ri-arrow-right-s-line icon-base"></i>
            </a>
          </div>

          <div className="layout-page">
            <nav className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme" id="layout-navbar">
              <div className="layout-menu-toggle navbar-nav align-items-xl-center me-4 me-xl-0 d-xl-none">
                <a className="nav-item nav-link px-0 me-xl-6" href="javascript:void(0)">
                  <i className="icon-base ri ri-menu-line icon-md"></i>
                </a>
              </div>
              <div className="navbar-nav-right d-flex align-items-center justify-content-end" id="navbar-collapse">
                <div className="navbar-nav align-items-center">
                  <h5 className="mb-0">Server Operation</h5>
                </div>
                <ul className="navbar-nav flex-row align-items-center ms-md-auto">
                  <li className="nav-item dropdown me-sm-2 me-xl-0">
                    <a className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill" id="nav-theme" href="javascript:void(0);" data-bs-toggle="dropdown">
                      <i className="icon-base ri ri-sun-line icon-22px theme-icon-active"></i>
                    </a>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li>
                        <button type="button" className="dropdown-item align-items-center active" data-bs-theme-value="light">
                          <span><i className="icon-base ri ri-sun-line icon-md me-3"></i>Light</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="dropdown-item align-items-center" data-bs-theme-value="dark">
                          <span><i className="icon-base ri ri-moon-clear-line icon-md me-3"></i>Dark</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="dropdown-item align-items-center" data-bs-theme-value="system">
                          <span><i className="icon-base ri ri-computer-line icon-md me-3"></i>System</span>
                        </button>
                      </li>
                    </ul>
                  </li>
                  <div className="nav-item d-flex align-items-center">
                    <Logo width={50} src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png" />
                  </div>
                </ul>
              </div>
            </nav>

            <div className="content-wrapper">
              <div className="container-xxl flex-grow-1 container-p-y">
                <div className="row gy-6">
                  <div className="col-12">
                    <div className="card server-card">
                      <div className="card-body">
                        <div className="row align-items-center">
                          <div className="col-md-8">
                            <div className="d-flex align-items-center mb-4">
                              <div className={`badge ${serverStatus.is_down ? 'bg-danger' : 'bg-success'} rounded-pill server-status-badge me-3`}>
                                <i className={`ri ${serverStatus.is_down ? 'ri-close-circle-line' : 'ri-checkbox-circle-line'} me-1`}></i>
                                {serverStatus.is_down ? 'OFFLINE' : 'ONLINE'}
                              </div>
                              <span className={`badge ${realtimeStatus === 'connected' ? 'bg-label-success' : realtimeStatus === 'connecting' ? 'bg-label-warning' : 'bg-label-danger'} rounded-pill`}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', marginRight: '6px', background: realtimeStatus === 'connected' ? '#28a745' : realtimeStatus === 'connecting' ? '#ffc107' : '#dc3545' }}></span>
                                {realtimeStatus === 'connected' ? 'Real-time Connected' : realtimeStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                              </span>
                            </div>
                            <h2 className="mb-2">Server Specifications</h2>
                            <p className="text-muted mb-0">VPS DigitalOcean Premium - High Performance Server</p>
                          </div>
                          <div className="col-md-4 text-center">
                            <div className="server-icon">
                              <i className="ri ri-server-line" style={{ fontSize: '100px', color: '#1d72f3' }}></i>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="card h-100">
                      <div className="card-header">
                        <h5 className="mb-0"><i className="ri ri-computer-line me-2"></i>System Information</h5>
                      </div>
                      <div className="card-body">
                        <div className="spec-item">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <div className="stat-icon bg-label-primary me-3">
                                <i className="ri ri-ubuntu-line"></i>
                              </div>
                              <div>
                                <small className="text-muted">Platform</small>
                                <h6 className="mb-0">Linux</h6>
                              </div>
                            </div>
                            <span className="badge bg-primary">OS</span>
                          </div>
                        </div>

                        <div className="spec-item">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <div className="stat-icon bg-label-info me-3">
                                <i className="ri ri-cpu-line"></i>
                              </div>
                              <div>
                                <small className="text-muted">Architecture</small>
                                <h6 className="mb-0">x64</h6>
                              </div>
                            </div>
                            <span className="badge bg-info">64-bit</span>
                          </div>
                        </div>

                        <div className="spec-item">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <div className="stat-icon bg-label-success me-3">
                                <i className="ri ri-terminal-box-line"></i>
                              </div>
                              <div>
                                <small className="text-muted">Hostname</small>
                                <h6 className="mb-0">S951789X5327812</h6>
                              </div>
                            </div>
                            <span className="badge bg-success">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="card h-100">
                      <div className="card-header">
                        <h5 className="mb-0"><i className="ri ri-cpu-line me-2"></i>CPU Information</h5>
                      </div>
                      <div className="card-body">
                        <div className="spec-item">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <div className="stat-icon bg-label-warning me-3">
                                <i className="ri ri-cpu-line"></i>
                              </div>
                              <div>
                                <small className="text-muted">Model</small>
                                <h6 className="mb-0 text-truncate" style={{ maxWidth: '200px' }}>AMD EPYC 8124P 16-Core Processor</h6>
                              </div>
                            </div>
                            <span className="badge bg-warning">AMD</span>
                          </div>
                        </div>

                        <div className="spec-item">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <div className="stat-icon bg-label-danger me-3">
                                <i className="ri ri-pie-chart-line"></i>
                              </div>
                              <div>
                                <small className="text-muted">CPU Cores</small>
                                <h6 className="mb-0">64 Cores</h6>
                              </div>
                            </div>
                            <span className="badge bg-danger">High Performance</span>
                          </div>
                        </div>

                        <div className="spec-item">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <div className="stat-icon bg-label-secondary me-3">
                                <i className="ri ri-building-line"></i>
                              </div>
                              <div>
                                <small className="text-muted">Provider</small>
                                <h6 className="mb-0">DigitalOcean VPS</h6>
                              </div>
                            </div>
                            <span className="badge bg-secondary">Cloud</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="card">
                      <div className="card-header">
                        <div className="d-flex align-items-center justify-content-between">
                          <h5 className="mb-0"><i className="ri ri-database-2-line me-2"></i>Memory Usage</h5>
                          <span className="badge bg-label-primary rounded-pill">Real-time</span>
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="row align-items-center">
                          <div className="col-md-8">
                            <div className="mb-4">
                              <div className="d-flex justify-content-between mb-2">
                                <span>Memory Used</span>
                                <span className="fw-bold">{serverStatus.memory_used_gb.toFixed(2)} GB / {serverStatus.memory_total_gb.toFixed(2)} GB</span>
                              </div>
                              <div className="progress" style={{ height: '20px' }}>
                                <div 
                                  className="progress-bar progress-animated" 
                                  role="progressbar" 
                                  style={{ 
                                    width: `${memoryUsagePercent}%`,
                                    background: `linear-gradient(90deg, #1d72f3, #9055fd)`
                                  }}
                                >
                                  {memoryUsagePercent}%
                                </div>
                              </div>
                            </div>

                            <div className="row g-4">
                              <div className="col-6 col-md-3">
                                <div className="text-center p-3 rounded" style={{ background: 'rgba(29, 114, 243, 0.1)' }}>
                                  <h4 className="mb-1 text-primary">{serverStatus.memory_total_gb.toFixed(2)}</h4>
                                  <small className="text-muted">Total RAM (GB)</small>
                                </div>
                              </div>
                              <div className="col-6 col-md-3">
                                <div className="text-center p-3 rounded" style={{ background: 'rgba(40, 167, 69, 0.1)' }}>
                                  <h4 className="mb-1 text-success">{serverStatus.memory_used_gb.toFixed(2)}</h4>
                                  <small className="text-muted">Used (GB)</small>
                                </div>
                              </div>
                              <div className="col-6 col-md-3">
                                <div className="text-center p-3 rounded" style={{ background: 'rgba(255, 193, 7, 0.1)' }}>
                                  <h4 className="mb-1 text-warning">{(serverStatus.memory_total_gb - serverStatus.memory_used_gb).toFixed(2)}</h4>
                                  <small className="text-muted">Free (GB)</small>
                                </div>
                              </div>
                              <div className="col-6 col-md-3">
                                <div className="text-center p-3 rounded" style={{ background: 'rgba(144, 85, 253, 0.1)' }}>
                                  <h4 className="mb-1" style={{ color: '#9055fd' }}>{memoryUsagePercent}%</h4>
                                  <small className="text-muted">Usage</small>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4 text-center mt-4 mt-md-0">
                            <div className="position-relative d-inline-block">
                              <svg viewBox="0 0 100 100" width="150" height="150">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e9ecef" strokeWidth="10"/>
                                <circle 
                                  cx="50" 
                                  cy="50" 
                                  r="45" 
                                  fill="none" 
                                  stroke="url(#gradient)" 
                                  strokeWidth="10"
                                  strokeDasharray={`${parseFloat(memoryUsagePercent) * 2.83} 283`}
                                  strokeLinecap="round"
                                  transform="rotate(-90 50 50)"
                                />
                                <defs>
                                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#1d72f3"/>
                                    <stop offset="100%" stopColor="#9055fd"/>
                                  </linearGradient>
                                </defs>
                                <text x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor">
                                  {memoryUsagePercent}%
                                </text>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="card">
                      <div className="card-body text-center py-5">
                        <small className="text-muted">
                          Last updated: {new Date(serverStatus.updated_at).toLocaleString('id-ID')}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="content-footer footer bg-footer-theme">
                  <div className="container-xxl">
                    <div className="footer-container d-flex align-items-center justify-content-between py-4 flex-md-row flex-column">
                      <div className="mb-1 mb-md-0"> © {new Date().getFullYear()} • Build on
                        <span className="text-body ms-1"><i className="icon-base tf-icons ri ri-cloud-line"></i></span>
                        <a href="https://vercel.com" target="_blank" className="footer-link text-body ms-1 d-inline-flex align-items-center">
                          <svg width="14" height="14" viewBox="0 0 76 65" fill="currentColor" className="me-1"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/></svg>
                          Vercel
                        </a>
                      </div>
                      <span className="mb-2 fs-tiny">Vallzx API Services</span>
                    </div>
                  </div>
                </footer>
              </div>
            </div>
          </div>
        </div>
        <div className="layout-overlay layout-menu-toggle"></div>
        <div className="drag-target"></div>
      </div>
    </>
  );
}
