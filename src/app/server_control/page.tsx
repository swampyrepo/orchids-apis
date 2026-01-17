"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Logo } from "@/components/Logo";
import { supabaseClient } from "@/lib/supabase-client";

const VALID_TOKEN = "bn-ANd9GcTTcY16BnOi1zJPxCFAwh3G_AjkpE8GzY4ZPkJbzFLh9i0cyCLKu4_tzy4s";

interface ServerStatus {
  is_down: boolean;
  down_reason: string | null;
  memory_used_gb: number;
  memory_total_gb: number;
  cpu_usage_percent: number;
  updated_at: string;
}

function ServerControlContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    is_down: false,
    down_reason: null,
    memory_used_gb: 9.95,
    memory_total_gb: 125.55,
    cpu_usage_percent: 8,
    updated_at: new Date().toISOString(),
  });
  const [downReason, setDownReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (token === VALID_TOKEN) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthorized) return;

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
          setDownReason(data.server.down_reason || "");
        }
      } catch (error) {
        console.error("Error fetching server status:", error);
      }
    };

    fetchServerStatus();

    const channel = supabaseClient
      .channel('server-control-realtime')
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
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
      html.className = "layout-navbar-fixed layout-wide";
      html.setAttribute("data-template", "front-pages");
    };
  }, [isAuthorized]);

  const handleServerDown = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/server-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "down",
          reason: downReason || "Server maintenance",
          token: token,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: 'Server berhasil dimatikan!' });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Gagal mematikan server' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Terjadi kesalahan' });
    }
    setIsLoading(false);
  };

  const handleServerUp = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/server-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "up",
          token: token,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: 'Server berhasil dihidupkan!' });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Gagal menghidupkan server' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Terjadi kesalahan' });
    }
    setIsLoading(false);
  };

  const handleLogoutAllUsers = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/server-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logout_all",
          token: token,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: 'Semua user berhasil di-logout!' });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Gagal logout users' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Terjadi kesalahan' });
    }
    setIsLoading(false);
  };

  const handleUpdateSystem = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/server-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_system",
          token: token,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: 'Sistem berhasil diupdate!' });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Gagal update sistem' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Terjadi kesalahan' });
    }
    setIsLoading(false);
  };

  if (isAuthorized === null) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b" }}>Memvalidasi token...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    notFound();
  }

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .control-card {
          background: linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%);
          border: 1px solid rgba(220, 53, 69, 0.2);
          transition: all 0.3s ease;
        }
        .control-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 40px rgba(220, 53, 69, 0.2);
        }
        .danger-btn {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          border: none;
          transition: all 0.3s ease;
        }
        .danger-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 5px 20px rgba(220, 53, 69, 0.4);
        }
        .success-btn {
          background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
          border: none;
          transition: all 0.3s ease;
        }
        .success-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 5px 20px rgba(40, 167, 69, 0.4);
        }
        .warning-btn {
          background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
          border: none;
          color: #000;
          transition: all 0.3s ease;
        }
        .warning-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 5px 20px rgba(255, 193, 7, 0.4);
        }
        .info-btn {
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
          border: none;
          transition: all 0.3s ease;
        }
        .info-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 5px 20px rgba(23, 162, 184, 0.4);
        }
        .status-indicator {
          animation: pulse 2s infinite;
        }
        .action-card {
          transition: all 0.3s ease;
          border-radius: 16px;
        }
        .action-card:hover {
          transform: translateY(-3px);
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
              <li className="menu-item">
                <a href="/server_operation" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-server-line"></i>
                  <div>Server Operation</div>
                </a>
              </li>
              <li className="menu-item active">
                <a href={`/server_control?token=${token}`} className="menu-link">
                  <i className="menu-icon tf-icons ri ri-settings-4-line"></i>
                  <div>Server Control</div>
                  <span className="badge bg-danger ms-auto">Admin</span>
                </a>
              </li>
            </ul>
          </aside>

          <div className="layout-page">
            <nav className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme" id="layout-navbar">
              <div className="navbar-nav-right d-flex align-items-center justify-content-end w-100" id="navbar-collapse">
                <div className="navbar-nav align-items-center">
                  <h5 className="mb-0">
                    <span className="badge bg-danger me-2">ADMIN</span>
                    Server Control Panel
                  </h5>
                </div>
                <ul className="navbar-nav flex-row align-items-center ms-md-auto">
                  <li className="nav-item dropdown me-sm-2 me-xl-0">
                    <a className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill" href="javascript:void(0);" data-bs-toggle="dropdown">
                      <i className="icon-base ri ri-sun-line icon-22px"></i>
                    </a>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><button type="button" className="dropdown-item" data-bs-theme-value="light"><i className="ri ri-sun-line me-2"></i>Light</button></li>
                      <li><button type="button" className="dropdown-item" data-bs-theme-value="dark"><i className="ri ri-moon-clear-line me-2"></i>Dark</button></li>
                      <li><button type="button" className="dropdown-item" data-bs-theme-value="system"><i className="ri ri-computer-line me-2"></i>System</button></li>
                    </ul>
                  </li>
                </ul>
              </div>
            </nav>

            <div className="content-wrapper">
              <div className="container-xxl flex-grow-1 container-p-y">
                <div className="row gy-6">
                  <div className="col-12">
                    <div className="alert alert-warning d-flex align-items-center" role="alert">
                      <i className="ri ri-error-warning-line me-2" style={{ fontSize: '24px' }}></i>
                      <div>
                        <strong>Perhatian!</strong> Halaman ini hanya untuk administrator. Semua aksi akan langsung dieksekusi.
                      </div>
                    </div>
                  </div>

                  {actionMessage && (
                    <div className="col-12">
                      <div className={`alert alert-${actionMessage.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`} role="alert">
                        <i className={`ri ${actionMessage.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} me-2`}></i>
                        {actionMessage.text}
                        <button type="button" className="btn-close" onClick={() => setActionMessage(null)}></button>
                      </div>
                    </div>
                  )}

                  <div className="col-12">
                    <div className="card control-card">
                      <div className="card-body">
                        <div className="row align-items-center">
                          <div className="col-md-8">
                            <div className="d-flex align-items-center mb-3">
                              <div className={`badge ${serverStatus.is_down ? 'bg-danger' : 'bg-success'} rounded-pill status-indicator me-3`} style={{ fontSize: '14px', padding: '10px 20px' }}>
                                <i className={`ri ${serverStatus.is_down ? 'ri-close-circle-line' : 'ri-checkbox-circle-line'} me-1`}></i>
                                {serverStatus.is_down ? 'SERVER OFFLINE' : 'SERVER ONLINE'}
                              </div>
                            </div>
                            <h2 className="mb-2">Server Control Panel</h2>
                            <p className="text-muted mb-0">Kontrol penuh terhadap server dan user management</p>
                            {serverStatus.down_reason && serverStatus.is_down && (
                              <p className="text-danger mt-2 mb-0">
                                <strong>Alasan Down:</strong> {serverStatus.down_reason}
                              </p>
                            )}
                          </div>
                          <div className="col-md-4 text-center">
                            <i className="ri ri-settings-4-line" style={{ fontSize: '80px', color: serverStatus.is_down ? '#dc3545' : '#28a745' }}></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="card action-card h-100">
                      <div className="card-header bg-danger text-white">
                        <h5 className="mb-0 text-white"><i className="ri ri-shut-down-line me-2"></i>Server Down</h5>
                      </div>
                      <div className="card-body">
                        <p className="text-muted mb-3">Mematikan server akan membuat situs tidak bisa diakses oleh pengguna (seperti di-DDoS).</p>
                        <div className="mb-3">
                          <label className="form-label">Alasan Down (opsional)</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Contoh: Server maintenance"
                            value={downReason}
                            onChange={(e) => setDownReason(e.target.value)}
                          />
                        </div>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn danger-btn text-white flex-grow-1"
                            onClick={handleServerDown}
                            disabled={isLoading || serverStatus.is_down}
                          >
                            {isLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="ri ri-shut-down-line me-2"></i>}
                            Down Server
                          </button>
                          <button 
                            className="btn success-btn text-white flex-grow-1"
                            onClick={handleServerUp}
                            disabled={isLoading || !serverStatus.is_down}
                          >
                            {isLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="ri ri-play-line me-2"></i>}
                            Up Server
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="card action-card h-100">
                      <div className="card-header bg-warning">
                        <h5 className="mb-0"><i className="ri ri-logout-box-line me-2"></i>Logout Semua User</h5>
                      </div>
                      <div className="card-body">
                        <p className="text-muted mb-3">Memaksa semua user yang sedang login untuk keluar dari sistem. Session mereka akan di-invalidate.</p>
                        <button 
                          className="btn warning-btn w-100"
                          onClick={handleLogoutAllUsers}
                          disabled={isLoading}
                        >
                          {isLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="ri ri-logout-box-line me-2"></i>}
                          Logout Semua User
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="card action-card h-100">
                      <div className="card-header bg-info text-white">
                        <h5 className="mb-0 text-white"><i className="ri ri-refresh-line me-2"></i>Update Sistem</h5>
                      </div>
                      <div className="card-body">
                        <p className="text-muted mb-3">Memperbarui timestamp sistem dan melakukan refresh status server.</p>
                        <button 
                          className="btn info-btn text-white w-100"
                          onClick={handleUpdateSystem}
                          disabled={isLoading}
                        >
                          {isLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="ri ri-refresh-line me-2"></i>}
                          Update Sistem
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="card action-card h-100">
                      <div className="card-header bg-secondary text-white">
                        <h5 className="mb-0 text-white"><i className="ri ri-database-2-line me-2"></i>Status Memory</h5>
                      </div>
                      <div className="card-body">
                        <div className="d-flex justify-content-between mb-2">
                          <span>Memory Used</span>
                          <strong>{serverStatus.memory_used_gb.toFixed(2)} GB / {serverStatus.memory_total_gb.toFixed(2)} GB</strong>
                        </div>
                        <div className="progress mb-3" style={{ height: '15px' }}>
                          <div 
                            className="progress-bar bg-primary" 
                            style={{ width: `${(serverStatus.memory_used_gb / serverStatus.memory_total_gb * 100).toFixed(1)}%` }}
                          >
                            {(serverStatus.memory_used_gb / serverStatus.memory_total_gb * 100).toFixed(1)}%
                          </div>
                        </div>
                        <small className="text-muted">Last updated: {new Date(serverStatus.updated_at).toLocaleString('id-ID')}</small>
                      </div>
                    </div>
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

export default function ServerControlPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b" }}>Memuat...</p>
      </div>
    }>
      <ServerControlContent />
    </Suspense>
  );
}
