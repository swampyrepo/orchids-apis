"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { Logo } from "@/components/Logo";
import { supabaseClient } from "@/lib/supabase-client";

export default function DocsPage() {
    const [stats, setStats] = useState({
      total_hits: "0",
      total_visitors: "0",
      total_success: "0",
      total_errors: "0",
      percent_rate: "0%"
    });
    const [usageList, setUsageList] = useState<any[]>([]);
    const [errorList, setErrorList] = useState<any[]>([]);
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const ipCache = useRef<Map<string, any>>(new Map());
    const chartsRef = useRef<Record<string, any>>({});

    const isUpdatingLogs = useRef(false);

    const calculatePercent = (hits: number, success: number) => {
      if (hits <= 0) return 0;
      const totalResponses = success + (parseInt(stats.total_errors) || 0);
      if (totalResponses <= 0) return 0;
      return Math.min(100, Math.round((success / totalResponses) * 100));
    };

    const updateCharts = (hitsValue: number, successValue: number, errorsValue: number = 0) => {
      const totalResponses = successValue + errorsValue;
      const percent = totalResponses > 0 ? Math.min(100, Math.round((successValue / totalResponses) * 100)) : 0;
      
      if ((window as any).ApexCharts) {
        const chartEl = document.querySelector("#persentSuccess");
        if (chartEl && !chartEl.hasAttribute('data-chart-rendered')) {
          if (chartsRef.current.radial) {
              chartsRef.current.radial.destroy();
          }
          const options = {
            chart: { height: 170, type: "radialBar" },
            plotOptions: {
              radialBar: {
                hollow: { size: "70%" },
                dataLabels: {
                  show: true,
                  name: { show: false },
                  value: {
                    fontSize: "20px",
                    offsetY: 10,
                    formatter: function(val: any) { return parseInt(val) + "%"; }
                  }
                }
              }
            },
            colors: ["#1d72f3"],
            series: [percent],
            labels: ["Success"]
          };
          chartsRef.current.radial = new (window as any).ApexCharts(chartEl, options);
          chartsRef.current.radial.render();
          chartEl.setAttribute('data-chart-rendered', 'true');
        } else if (chartsRef.current.radial) {
          chartsRef.current.radial.updateSeries([percent]);
        }
      }

      if ((window as any).ApexCharts) {
        const weeklyEl = document.querySelector("#weeklyOverviewChart");
        if (weeklyEl && !weeklyEl.hasAttribute('data-chart-rendered')) {
          if (chartsRef.current.weekly) {
              chartsRef.current.weekly.destroy();
          }
          const options = {
            chart: { type: 'bar', height: 200, toolbar: { show: false } },
            plotOptions: { bar: { columnWidth: '60%', borderRadius: 4 } },
            colors: ["#1d72f3"],
            series: [{ name: 'Hits', data: [hitsValue - 20, hitsValue - 10, hitsValue - 5, hitsValue - 15, hitsValue - 8, hitsValue - 2, hitsValue] }],
            xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], axisBorder: { show: false } },
            yaxis: { show: false },
            grid: { show: false }
          };
          chartsRef.current.weekly = new (window as any).ApexCharts(weeklyEl, options);
          chartsRef.current.weekly.render();
          weeklyEl.setAttribute('data-chart-rendered', 'true');
        } else if (chartsRef.current.weekly) {
          chartsRef.current.weekly.updateSeries([{ name: 'Hits', data: [hitsValue - 20, hitsValue - 10, hitsValue - 5, hitsValue - 15, hitsValue - 8, hitsValue - 2, hitsValue] }]);
        }
      }
    };

    useEffect(() => {
      const html = document.documentElement;
      html.className = "layout-navbar-fixed layout-menu-fixed layout-compact";
      html.setAttribute("data-template", "vertical-menu-template");
      html.setAttribute("data-assets-path", "https://api.vreden.my.id/assets/");

      const identifyDevice = (userAgent: string) => {
        if (!userAgent) return "browser";
        if (/axios/i.test(userAgent)) return "axios";
        if (/fetch/i.test(userAgent)) return "fetch";
        if (/android/i.test(userAgent)) return "android";
        if (/iphone|ipod/i.test(userAgent)) return "iPhone";
        if (/ipad/i.test(userAgent)) return "iPad";
        if (/macintosh/i.test(userAgent)) return "mac";
        if (/linux/i.test(userAgent)) return "linux";
        if (/windows/i.test(userAgent)) return "windows";
        if (/chrome/i.test(userAgent)) return "chrome";
        if (/firefox/i.test(userAgent)) return "firefox";
        if (/safari/i.test(userAgent)) return "safari";
        if (/edge/i.test(userAgent)) return "edge";
        if (/opera/i.test(userAgent)) return "opera";
        return "browser";
      };

      const fetchIpInfo = async (ip: string) => {
        try {
          const response = await fetch(`https://ipwho.is/${ip}?lang=en`);
          const data = await response.json();
          return {
            country: {
              iso_code: data.country_code
            },
            traits: {
              organization: data.connection?.isp || data.connection?.asn || 'Unknown'
            }
          };
        } catch (e) {
          return null;
        }
      };

      const updateLists = async (data: any, type: "usage" | "error") => {
        if (!data || data.length === 0) return;
        const itemsWithInfo = await Promise.all(
          data.map(async (item: any) => {
            let info = ipCache.current.get(item.ip_address);
            if (!info) {
              info = await fetchIpInfo(item.ip_address);
              if (info) ipCache.current.set(item.ip_address, info);
            }
            return { ...item, info, device: identifyDevice(item.user_agent) };
          })
        );
        if (type === "usage") {
          setUsageList(prev => {
            if (JSON.stringify(prev.map(i => i.created_at)) === JSON.stringify(itemsWithInfo.map(i => i.created_at))) return prev;
            return itemsWithInfo;
          });
        } else {
          setErrorList(prev => {
            if (JSON.stringify(prev.map(i => i.created_at)) === JSON.stringify(itemsWithInfo.map(i => i.created_at))) return prev;
            return itemsWithInfo;
          });
        }
      };

      const fetchLogs = async () => {
        if (isUpdatingLogs.current) return;
        isUpdatingLogs.current = true;
        try {
          const response = await fetch("/api/logs");
          const data = await response.json();
          if (data.latest_command) await updateLists(data.latest_command, "usage");
          if (data.latest_error) await updateLists(data.latest_error, "error");
        } catch (e) {
          console.error("Error fetching logs:", e);
        } finally {
          isUpdatingLogs.current = false;
        }
      };

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
          const hitsValue = parseInt(data.total_hits) || 0;
          const successValue = parseInt(data.total_success) || 0;
          const percent = hitsValue > 0 ? Math.round((successValue / hitsValue) * 100) : 0;

          setStats({
            total_hits: String(hitsValue),
            total_visitors: data.total_visitors || "0",
            total_success: String(successValue),
            total_errors: data.total_errors || "0",
            percent_rate: percent + "%"
          });

          setTimeout(() => updateCharts(hitsValue, successValue), 500);
        } catch (error) {
          console.error("Error fetching statistics:", error);
        }
      };

      fetchLogs();
      fetchInitialStats();

      const statsChannel = supabaseClient
        .channel('statistics-realtime')
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
            const hitsValue = newData.total_requests || 0;
            const successValue = newData.total_success || 0;
            const errorsValue = newData.total_errors || 0;
            const totalResponses = successValue + errorsValue;
            const percent = totalResponses > 0 ? Math.min(100, Math.round((successValue / totalResponses) * 100)) : 0;

            setStats({
              total_hits: String(hitsValue),
              total_visitors: String(newData.total_visitors || 0),
              total_success: String(successValue),
              total_errors: String(errorsValue),
              percent_rate: percent + "%"
            });

            updateCharts(hitsValue, successValue, errorsValue);
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

      const logsChannel = supabaseClient
        .channel('logs-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'usage_logs'
          },
          async (payload) => {
            const newLog = payload.new as any;
            let info = ipCache.current.get(newLog.ip_address);
            if (!info) {
              info = await fetchIpInfo(newLog.ip_address);
              if (info) ipCache.current.set(newLog.ip_address, info);
            }
            
            const logItem = {
              ...newLog,
              router: newLog.endpoint,
              method: newLog.method,
              status: newLog.status_code,
              user_agent: newLog.user_agent,
              ip_address: newLog.ip_address,
              timestamp: new Date(newLog.created_at).toLocaleTimeString(),
              date_now: new Date(newLog.created_at).toLocaleString(),
              info,
              device: identifyDevice(newLog.user_agent || '')
            };

            if (newLog.is_success) {
              setUsageList(prev => [logItem, ...prev].slice(0, 20));
            } else {
              setErrorList(prev => [logItem, ...prev].slice(0, 20));
            }
          }
        )
        .subscribe();

      return () => {
        supabaseClient.removeChannel(statsChannel);
        supabaseClient.removeChannel(logsChannel);
        html.className = "layout-navbar-fixed layout-wide";
        html.setAttribute("data-template", "front-pages");
        if (chartsRef.current.radial) chartsRef.current.radial.destroy();
        if (chartsRef.current.weekly) chartsRef.current.weekly.destroy();
      };
    }, []);

  return (
    <>
      <style jsx global>{`
        .fs-7 { font-size: 0.8125rem !important }
        .fs-8 { font-size: 0.75rem !important }
        .fs-9 { font-size: 0.6875rem !important }
        .fs-micro { font-size: 60% !important }
        .text-solid-primary { color: #1d72f3 !important; }
        .text-solid-secondary { color: #757d85 !important; }
        .text-solid-success { color: #28a745 !important; }
        .text-solid-danger { color: #e53935 !important; }
        .text-solid-warning { color: #fbc02d !important; }
        .text-solid-info { color: #17a2b8 !important; }
        .text-solid-theme { color: var(--bs-theme-color) !important; }
        .bg-solid-primary { background-color: #1d72f3 !important; color: #fff !important; }
        .bg-solid-secondary { background-color: #757d85 !important; color: #fff !important; }
        .bg-solid-success { background-color: #28a745 !important; color: #fff !important; }
        .bg-solid-danger { background-color: #e53935 !important; color: #fff !important; }
        .bg-solid-warning { background-color: #fbc02d !important; color: #fff !important; }
        .bg-solid-info { background-color: #17a2b8 !important; color: #fff !important; }
        .bg-solid-theme { background-color: var(--bs-theme-bg) !important; color: var(--bs-theme-color) !important; }
          .list-items { max-height: 320px; overflow-y: auto; overflow-x: hidden; }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .realtime-dot {
            animation: pulse 2s infinite;
          }
        `}</style>

      {/* External CSS Assets */}
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/fonts/iconify-icons.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/node-waves/node-waves.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/pickr/pickr-themes.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/css/core.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/css/demo.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.css" />
      <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/apex-charts/apex-charts.css" />

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
      <Script src="https://api.vreden.my.id/assets/vendor/libs/apex-charts/apexcharts.js" strategy="afterInteractive" />
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
              
              // Update active state on buttons
              document.querySelectorAll('[data-bs-theme-value]').forEach(function(btn) {
                btn.classList.remove('active');
                if (btn.getAttribute('data-bs-theme-value') === theme) {
                  btn.classList.add('active');
                }
              });
              
              // Update theme icon
              var iconActive = document.querySelector('.theme-icon-active');
              if (iconActive) {
                iconActive.className = iconActive.className.replace(/ri-sun-line|ri-moon-clear-line|ri-computer-line/, '');
                if (theme === 'dark') {
                  iconActive.classList.add('ri-moon-clear-line');
                } else if (theme === 'system') {
                  iconActive.classList.add('ri-computer-line');
                } else {
                  iconActive.classList.add('ri-sun-line');
                }
              }
            }
            
            // Load saved theme
            var savedTheme = localStorage.getItem('theme') || 'light';
            setTheme(savedTheme);
            
            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
              if (localStorage.getItem('theme') === 'system') {
                setTheme('system');
              }
            });
            
            // Add click handlers to theme buttons
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
              <li className="menu-item active open">
                <a href="javascript:void(0);" className="menu-link menu-toggle">
                  <i className="menu-icon tf-icons ri ri-home-smile-line"></i>
                  <div data-i18n="Dashboards">Dashboards</div>
                </a>
                <ul className="menu-sub">
                  <li className="menu-item">
                    <a href="https://vreden-api-root-page.vercel.app" target="_blank" className="menu-link">
                      <div data-i18n="Canvas">Canvas</div>
                    </a>
                  </li>
                  <li className="menu-item active">
                    <a href="#" className="menu-link">
                      <div data-i18n="Rest Api">Rest Api</div>
                    </a>
                  </li>
                  <li className="menu-item">
                    <a href="https://vreden-api-root-page.vercel.app" target="_blank" className="menu-link">
                      <div data-i18n="YouTube">YouTube</div>
                    </a>
                  </li>
                </ul>
              </li>
              <li className="menu-item">
                <a href="javascript:void(0);" className="menu-link menu-toggle">
                  <i className="menu-icon tf-icons ri ri-wechat-line"></i>
                  <div data-i18n="Support">Support</div>
                </a>
                <ul className="menu-sub">
                  <li className="menu-item">
                    <a href="https://whatsapp.com/channel/0029Vaf0HPMLdQeZsp3XRp2T" target="_blank" className="menu-link">
                      <div data-i18n="Channel">Channel Info</div>
                    </a>
                  </li>
                  <li className="menu-item">
                    <a href="https://chat.whatsapp.com/H7hj33sMbLmCzx4lcdSqmo" target="_blank" className="menu-link">
                      <div data-i18n="Group Chat">Group Chat</div>
                    </a>
                  </li>
                    <li className="menu-item">
                      <a href="https://wa.me/6289531606677" target="_blank" className="menu-link">
                        <div data-i18n="WhatsApp">WhatsApp</div>
                      </a>
                    </li>
                  </ul>
                </li>
                <li className="menu-header mt-7">
                  <span className="menu-header-text">Generators</span>
                </li>
                <li className="menu-item">
                  <a href="/tts-generator" className="menu-link">
                    <i className="menu-icon tf-icons ri ri-mic-line"></i>
                    <div>TTS Generator</div>
                  </a>
                </li>

                <li className="menu-header mt-7">
                  <span className="menu-header-text">API Services</span>
                </li>
              
              <li className="menu-item">
                  <a href="javascript:void(0);" className="menu-link menu-toggle">
                      <i className="menu-icon tf-icons ri ri-download-cloud-line"></i>
                      <div data-i18n="Downloader">Downloader</div>
                  </a>
                  <ul className="menu-sub">
                      <li className="menu-item">
                          <a href="/api/download/capcut?url=https://www.capcut.com/templates/7409863655921028360" target="_blank" className="menu-link">
                              <div data-i18n="CapCut">CapCut</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/facebook?url=https://www.facebook.com/share/r/16sXMhKi6e/" target="_blank" className="menu-link">
                              <div data-i18n="Facebook">Facebook</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/fdroid?url=https://f-droid.org/en/packages/com.termux" target="_blank" className="menu-link">
                              <div data-i18n="F-Droid">F-Droid</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/gdrive?url=https://drive.google.com/file/d/1DrZxDdfPSGcabL3qkqI-4ON9xY3oDPdO/view?usp=drivesdk" target="_blank" className="menu-link">
                              <div data-i18n="Google Drive">Google Drive</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/instagram?url=https://www.instagram.com/reel/C6AtQa1LEX0/?igsh=YzljYTk1ODg3Zg==" target="_blank" className="menu-link">
                              <div data-i18n="Instagram">Instagram</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/v2/download/instagram?url=https://www.instagram.com/reel/C6AtQa1LEX0/?igsh=YzljYTk1ODg3Zg==" target="_blank" className="menu-link">
                              <div data-i18n="Instagram 2">Instagram 2</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/mediafire?url=https://www.mediafire.com/file/e8497sb1ngvuq42/Free+Fire+MAX+2.62.2.apk/file" target="_blank" className="menu-link">
                              <div data-i18n="MediaFire">MediaFire</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/pinterest?url=https://pinterest.com/pin/92534967353837069" target="_blank" className="menu-link">
                              <div data-i18n="Pinterest">Pinterest</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/spotify?url=https://open.spotify.com/track/3k68kVFWTTBP0Jb4LOzCax" target="_blank" className="menu-link">
                              <div data-i18n="Spotify">Spotify</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/threads?url=https://www.threads.com/@mamanyahyaali/post/DOslYoXAVSs?xmt=AQF0bS3bvQLFwrr-Dwv9-NpQqjhCzxz1Uu6JgxanwG2_gA&slof=1" target="_blank" className="menu-link">
                              <div data-i18n="Threads">Threads</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/tiktok?url=https://vm.tiktok.com/ZSHnCTfnocKjS-G1ogy/" target="_blank" className="menu-link">
                              <div data-i18n="TikTok">TikTok</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/xnxx?url=https://www.xnxx.com/video-fzypdd8/beautiful_filipina_with_big_tits" target="_blank" className="menu-link">
                              <div data-i18n="XNXX">XNXX</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/youtube/audio?url=https://youtu.be/HWjCStB6k4o?si=5dut5VewWyAn9cY-&quality=128" target="_blank" className="menu-link">
                              <div data-i18n="YouTube Audio">YouTube Audio</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/youtube/video?url=https://youtu.be/HWjCStB6k4o?si=5dut5VewWyAn9cY-&quality=360" target="_blank" className="menu-link">
                              <div data-i18n="YouTube Video">YouTube Video</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/download/play/audio?query=Happy Nation" target="_blank" className="menu-link">
                              <div data-i18n="Play Audio">Play Audio</div>
                          </a>
                      </li>
                        <li className="menu-item">
                            <a href="/api/download/play/video?query=Happy Nation" target="_blank" className="menu-link">
                                <div data-i18n="Play Video">Play Video</div>
                            </a>
                        </li>
                          <li className="menu-item">
                              <a href="/api/downloader/tiktokvid2mp3?tiktokvid_url=https://vm.tiktok.com/ZSHnCTfnocKjS-G1ogy/" target="_blank" className="menu-link">
                                  <div data-i18n="Download TikTok Video to MP3">Download TikTok Video to MP3</div>
                                  <div className="badge bg-label-success fs-tiny rounded-pill ms-auto">MP3</div>
                              </a>
                          </li>
                          <li className="menu-item">
                              <a href="/api/downloader/tiktokmp4downloader?tiktokvid_url=https://vt.tiktok.com/ZS5pcbS54/" target="_blank" className="menu-link">
                                  <div data-i18n="Download TikTok MP4">Download TikTok MP4</div>
                                  <div className="badge bg-label-info fs-tiny rounded-pill ms-auto">MP4/MP3</div>
                              </a>
                          </li>
                      </ul>
                </li>
              <li className="menu-item">
                  <a href="javascript:void(0);" className="menu-link menu-toggle">
                      <i className="menu-icon tf-icons ri ri-search-line"></i>
                      <div data-i18n="Searching">Searching</div>
                  </a>
                  <ul className="menu-sub">
                      <li className="menu-item">
                          <a href="/api/search/capcut?query=DJ netizen rahmatahalu" target="_blank" className="menu-link">
                              <div data-i18n="CapCut">CapCut</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/fdroid?query=termux" target="_blank" className="menu-link">
                              <div data-i18n="F-Droid">F-Droid</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/genius?query=Jomblo happy" target="_blank" className="menu-link">
                              <div data-i18n="Genius Find">Genius Find</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/genius/lyrics?url=https://genius.com/Gamma1-jomblo-happy-lyrics" target="_blank" className="menu-link">
                              <div data-i18n="Genius Lyrics">Genius Lyrics</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/google/image?query=Vreden Bot" target="_blank" className="menu-link">
                              <div data-i18n="Google Image">Google Image</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/google/play?query=WhatsApp" target="_blank" className="menu-link">
                              <div data-i18n="Google Play">Google Play</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/google?query=Vreden Bot&count=10" target="_blank" className="menu-link">
                              <div data-i18n="Google Search">Google Search</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/hero/detail?url=https://mobile-legends.fandom.com/wiki/Miya" target="_blank" className="menu-link">
                              <div data-i18n="Hero Detail">Hero Detail</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/hero/list" target="_blank" className="menu-link">
                              <div data-i18n="Hero List">Hero List</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/instagram/hashtags?query=yahyaalmthr" target="_blank" className="menu-link">
                              <div data-i18n="Instagram Hashtags">Instagram Hashtags</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/instagram/reels?query=yahyaalmthr" target="_blank" className="menu-link">
                              <div data-i18n="Instagram Reels">Instagram Reels</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/instagram/users?query=yahyaalmthr" target="_blank" className="menu-link">
                              <div data-i18n="Instagram Users">Instagram Users</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/pinterest?query=Free Fire" target="_blank" className="menu-link">
                              <div data-i18n="Pinterest 1">Pinterest 1</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/v2/search/pinterest?query=pemandangan+alam&limit=10&type=videos" target="_blank" className="menu-link">
                              <div data-i18n="Pinterest 2">Pinterest 2</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/pixiv?query=loli" target="_blank" className="menu-link">
                              <div data-i18n="Pixiv">Pixiv</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/soundmeme/trending" target="_blank" className="menu-link">
                              <div data-i18n="Soundmeme Trending">Soundmeme Trending</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/soundmeme?query=Jokowi" target="_blank" className="menu-link">
                              <div data-i18n="Soundmeme Search">Soundmeme Search</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/spotify?query=Jomblo+happy&limit=10" target="_blank" className="menu-link">
                              <div data-i18n="Spotify 1">Spotify 1</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/v2/search/spotify?query=Jomblo+happy" target="_blank" className="menu-link">
                              <div data-i18n="Spotify 2">Spotify 2</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/tiktok?query=Matshuka" target="_blank" className="menu-link">
                              <div data-i18n="TikTok">TikTok</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/search/xnxx?query=Big+tits" target="_blank" className="menu-link">
                              <div data-i18n="XNXX">XNXX</div>
                          </a>
                      </li>
                  </ul>
              </li>
              <li className="menu-item">
                  <a href="javascript:void(0);" className="menu-link menu-toggle">
                      <i className="menu-icon tf-icons ri ri-book-line"></i>
                      <div data-i18n="Islamic">Islamic</div>
                  </a>
                  <ul className="menu-sub">
                      <li className="menu-item">
                          <a href="/api/islamic/asmaulhusna" target="_blank" className="menu-link">
                              <div data-i18n="Asmaul Husna 1">Asmaul Husna 1</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/v2/islamic/asmaulhusna?urutan=1" target="_blank" className="menu-link">
                              <div data-i18n="Asmaul Husna 2">Asmaul Husna 2</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/islamic/jadwalsholat?kota=kuala+lumpur" target="_blank" className="menu-link">
                              <div data-i18n="Jadwal Sholat">Jadwal Sholat</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/islamic/kisahnabi?nama=Muhammad" target="_blank" className="menu-link">
                              <div data-i18n="Kisah Nabi">Kisah Nabi</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/islamic/quran/list" target="_blank" className="menu-link">
                              <div data-i18n="Al Qur'an List">Al Qur'an List</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/islamic/quran/audio?nomor=1" target="_blank" className="menu-link">
                              <div data-i18n="Al Qur'an Audio">Al Qur'an Audio</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/islamic/quran/random" target="_blank" className="menu-link">
                              <div data-i18n="Al Qur'an Random">Al Qur'an Random</div>
                          </a>
                      </li>
                  </ul>
              </li>
              <li className="menu-item">
                  <a href="javascript:void(0);" className="menu-link menu-toggle">
                      <i className="menu-icon tf-icons ri ri-gamepad-line"></i>
                      <div data-i18n="Game">Game</div>
                  </a>
                  <ul className="menu-sub">
                      <li className="menu-item">
                          <a href="/api/game/asahotak" target="_blank" className="menu-link">
                              <div data-i18n="Asah Otak">Asah Otak</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/caklontong" target="_blank" className="menu-link">
                              <div data-i18n="Cak Lontong">Cak Lontong</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/family100" target="_blank" className="menu-link">
                              <div data-i18n="Family100">Family100</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/ibukota" target="_blank" className="menu-link">
                              <div data-i18n="Ibu Kota">Ibu Kota</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/kuis" target="_blank" className="menu-link">
                              <div data-i18n="Kuis">Kuis</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/lengkapikalimat" target="_blank" className="menu-link">
                              <div data-i18n="Lengkapi Kalimat">Lengkapi Kalimat</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/math" target="_blank" className="menu-link">
                              <div data-i18n="Math">Math</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/memberjkt48" target="_blank" className="menu-link">
                              <div data-i18n="Member JKT48">Member JKT48</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/siapakahaku" target="_blank" className="menu-link">
                              <div data-i18n="Siapakah Aku">Siapakah Aku</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/susunkata" target="_blank" className="menu-link">
                              <div data-i18n="Susun Kata">Susun Kata</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/aplikasi" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Aplikasi">Tebak Aplikasi</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/bendera" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Bendera">Tebak Bendera</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/ff" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Free Fire">Tebak Free Fire</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/gambar" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Gambar">Tebak Gambar</div>
                          </a>
                      </li>

                      <li className="menu-item">
                          <a href="/api/game/tebak/hero" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Hero 1">Tebak Hero 1</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/v2/game/tebak/hero" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Hero 2">Tebak Hero 2</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/hewan" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Hewan">Tebak Hewan</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/kabupaten" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Kabupaten">Tebak Kabupaten</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/kata" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Kata">Tebak Kata</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/kimia" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Kimia">Tebak Kimia</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/lagu" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Lagu">Tebak Lagu</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/lirik" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Lirik">Tebak Lirik</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/logo" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Logo">Tebak Logo</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/game/tebak/tebakan" target="_blank" className="menu-link">
                              <div data-i18n="Tebak Tebakan">Tebak Tebakan</div>
                          </a>
                      </li>
                  </ul>
              </li>
                <li className="menu-item">
                    <a href="javascript:void(0);" className="menu-link menu-toggle">
                          <i className="menu-icon tf-icons ri ri-brain-line"></i>
                          <div data-i18n="AI">AI</div>
                      </a>
                    <ul className="menu-sub">
                          <li className="menu-item">
                              <a href="/api/artificial/aiease/style" target="_blank" className="menu-link">
                                <div data-i18n="Aiease: list style">Aiease: list style</div>
                                <div className="badge bg-label-primary fs-tiny rounded-pill ms-auto">Limits</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/aiease/img2img?url=https://files.catbox.moe/ldsyfx.jpg&style=4" target="_blank" className="menu-link">
                                <div data-i18n="Aiease: filter">Aiease: filter</div>
                                <div className="badge bg-label-primary fs-tiny rounded-pill ms-auto">Limits</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/aiease/enhance?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Aiease: enhance">Aiease: enhance</div>
                                <div className="badge bg-label-primary fs-tiny rounded-pill ms-auto">Limits</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/aiease/watermark?url=https://i.ibb.co.com/GB4Ncmz/4ah8supp.webp" target="_blank" className="menu-link">
                                <div data-i18n="Aiease: watermark">Aiease: watermark</div>
                                <div className="badge bg-label-primary fs-tiny rounded-pill ms-auto">Limits</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/aiease/background?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Aiease: remove bg">Aiease: remove bg</div>
                                <div className="badge bg-label-primary fs-tiny rounded-pill ms-auto">Limits</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/botika?prompt=hai&username=vreden123" target="_blank" className="menu-link">
                                <div data-i18n="Botika">Botika</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/deepai/colorizer?url=https://files.catbox.moe/5im96a.jpeg" target="_blank" className="menu-link">
                                <div data-i18n="Deepai: colorizer">Deepai: colorizer</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imgedit/sketch?url=https://files.catbox.moe/ldsyfx.jpg&style=manga_sketch" target="_blank" className="menu-link">
                                <div data-i18n="Imgedit: sketch">Imgedit: sketch</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imgedit/cartoon?url=https://files.catbox.moe/ldsyfx.jpg&style=clay" target="_blank" className="menu-link">
                                <div data-i18n="Imgedit: cartoon">Imgedit: cartoon</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imgedit/background?url=https://files.catbox.moe/ldsyfx.jpg&style=general&prompt=luxury+villa" target="_blank" className="menu-link">
                                <div data-i18n="Imgedit: background">Imgedit: background</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imgedit/filter?url=https://files.catbox.moe/ldsyfx.jpg&reff_url=https://imgedit.ai/cdnImages/template/wordart/style/mx/0057.png&creativity=0.5" target="_blank" className="menu-link">
                                <div data-i18n="Imgedit: filter">Imgedit: filter</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imgedit/expand?url=https://files.catbox.moe/ldsyfx.jpg&top=100&bottom=100&left=100&right=100" target="_blank" className="menu-link">
                                <div data-i18n="Imgedit: expand">Imgedit: expand</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imgedit/faceswap?from_url=https://files.catbox.moe/hf50g5.jpg&to_url=https://files.catbox.moe/poc1tg.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Imgedit: faceswap">Imgedit: faceswap</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imgedit/removebg?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Imgedit: removebg">Imgedit: removebg</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imgedit/unblur?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Imgedit: unblur">Imgedit: unblur</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imgedit/restoration?url=https://files.catbox.moe/r2qbll.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Imgedit: restoration">Imgedit: restoration</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imglarger/removebg?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Imglarger: removebg">Imglarger: removebg</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imglarger/upscale?url=https://files.catbox.moe/ldsyfx.jpg&scale=2" target="_blank" className="menu-link">
                                <div data-i18n="Imglarger: upscale">Imglarger: upscale</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imglarger/enhance?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Imglarger: enhance">Imglarger: enhance</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imglarger/repair?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Imglarger: repair">Imglarger: repair</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/imglarger/restoration?url=https://files.catbox.moe/r2qbll.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Imglarger: restoration">Imglarger: restoration</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/logic?query=buatin+foto+pemandangan+alam+anime" target="_blank" className="menu-link">
                                <div data-i18n="Logic">Logic</div>
                            </a>
                        </li>
                          <li className="menu-item">
                              <a href="/api/artificial/pxpic/removebg?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                  <div data-i18n="Pxpic: removebg">Pxpic: removebg</div>
                              </a>
                          </li>
                        <li className="menu-item">
                            <a href="/api/artificial/pxpic/enhance?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Pxpic: enhance">Pxpic: enhance</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/pxpic/upscale?url=https://files.catbox.moe/ldsyfx.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Pxpic: upscale">Pxpic: upscale</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/pxpic/restore?url=https://files.catbox.moe/r2qbll.jpg" target="_blank" className="menu-link">
                                <div data-i18n="Pxpic: restore">Pxpic: restore</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/artificial/pxpic/colorizer?url=https://files.catbox.moe/5im96a.jpeg" target="_blank" className="menu-link">
                                <div data-i18n="Pxpic: colorizer">Pxpic: colorizer</div>
                            </a>
                        </li>
                          <li className="menu-item">
                              <a href="/api/ai/wormgpt-ai?prompt?=Siapa%20Kamu?" target="_blank" className="menu-link">
                                  <i className="menu-icon tf-icons ri ri-openai-fill me-2"></i>
                                  <div data-i18n="WormGPT">WormGPT</div>
                                  <div className="badge bg-label-danger fs-tiny rounded-pill ms-auto">WormGPT-ssr</div>
                              </a>
                          </li>
                        </ul>
                    </li>
                <li className="menu-item">
                    <a href="javascript:void(0);" className="menu-link menu-toggle">
                        <i className="menu-icon tf-icons ri ri-image-fill"></i>
                        <div data-i18n="Image Generator">Image Generator</div>
                    </a>
                    <ul className="menu-sub">
                        <li className="menu-item">
                            <a href="/api/image-generator/dreamify?prompt=cat playing football&models=cyberpunk style" target="_blank" className="menu-link">
                                <div data-i18n="Dreamify">Dreamify</div>
                                <div className="badge bg-label-success fs-tiny rounded-pill ms-auto">New AI</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/image-generator/fal-ai?prompt=A wide-angle eye-level shot from a right-side perspective of a modern shopping mall facade. Above the main entrance, there is a large, glowing 3D sign that clearly says 'MALL ID FRP'. In the foreground and side area, there is a crowded outdoor parking lot filled with various modern cars. Many people are seen walking, some entering and some exiting the mall's glass doors. Bright daylight, cinematic lighting, 8k resolution, highly detailed architecture.&image_size=landscape_16_9" target="_blank" className="menu-link">
                                <div data-i18n="Fal.ai: Flux Dev">Fal.ai: Flux Dev</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/image-generator/amazonai?prompt=Magical+floating+islands+in+the+sky+with+waterfalls,+crystal+formations,+and+ancient+ruins&frame=4" target="_blank" className="menu-link">
                                <div data-i18n="Amazon Image">Amazon Image</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/image-generator/animagine?prompt=Magical+floating+islands+in+the+sky+with+waterfalls,+crystal+formations,+and+ancient+ruins" target="_blank" className="menu-link">
                                <div data-i18n="Animagine">Animagine</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/image-generator/deepai/text2img?prompt=Magical+floating+islands+in+the+sky+with+waterfalls,+crystal+formations,+and+ancient+ruins&shape=square&model=future-architecture-generator" target="_blank" className="menu-link">
                                <div data-i18n="Deepai: text2img">Deepai: text2img</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/image-generator/imagen-1.9-fast?prompt=A high-tech futuristic sports car driving through a neon-lit Tokyo street at night, rainy weather, puddles reflecting neon lights, cinematic lighting, 8k resolution, photorealistic" target="_blank" className="menu-link">
                                <div data-i18n="Imagen 1.9 Fast">Imagen 1.9 Fast</div>
                                <div className="badge bg-label-info fs-tiny rounded-pill ms-auto">VSID Image Generator</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/image-generator/text2img?prompt=Magical+floating+islands+in+the+sky+with+waterfalls,+crystal+formations,+and+ancient+ruins" target="_blank" className="menu-link">
                                <div data-i18n="Text2img">Text2img</div>
                            </a>
                        </li>
                          <li className="menu-item">
                              <a href="/api/image-generator/imagen-3.3-ultimate?prompt=Futuristic megacity at night with towering skyscrapers glowing in neon lights." target="_blank" className="menu-link">
                                  <div data-i18n="Imagen 3.3 Ultimate">Imagen 3.3 Ultimate</div>
                              </a>
                          </li>
                        <li className="menu-item">
                            <a href="/api/image-generator/aiease/text2img?prompt=Magical+floating+islands+in+the+sky+with+waterfalls,+crystal+formations,+and+ancient+ruins&style=4" target="_blank" className="menu-link">
                                <div data-i18n="Aiease: text2img">Aiease: text2img</div>
                                <div className="badge bg-label-primary fs-tiny rounded-pill ms-auto">Limits</div>
                            </a>
                        </li>
                    </ul>
                </li>
                    <li className="menu-item">
                        <a href="javascript:void(0);" className="menu-link menu-toggle">
                            <i className="menu-icon tf-icons ri ri-mic-line"></i>
                            <div data-i18n="Text-to-speech Generator">Text-to-speech Generator</div>
                        </a>
                          <ul className="menu-sub">
                              <li className="menu-item">
                                  <a href="/api/v3/text-to-speech?text=kehidupan bukan selalu tentang kecepatan tetapi arah yang benar.&voice=putri_maharani" target="_blank" className="menu-link">
                                      <div data-i18n="TTS - Putri Maharani">TTS - Putri Maharani</div>
                                      <div className="badge bg-label-success fs-tiny rounded-pill ms-auto">ElevenLabs</div>
                                  </a>
                              </li>
                              <li className="menu-item">
                                  <a href="/api/tools/text-to-speech?text=Halo&speaking-id=iWydkXKoiVtvdn4vLKp9" target="_blank" className="menu-link">
                                      <div data-i18n="Text-to-speech">Text-to-speech</div>
                                      <div className="badge bg-label-info fs-tiny rounded-pill ms-auto">ElevenLabs</div>
                                  </a>
                              </li>
                                <li className="menu-item">
                                    <a href="/api/text-to-speech/v2?text=Halo&voice=prabowo-subianto" target="_blank" className="menu-link">
                                        <div data-i18n="TTS Custom Voice">TTS Custom Voice</div>
                                        <div className="badge bg-label-info fs-tiny rounded-pill ms-auto">Fish Audio</div>
                                    </a>
                                </li>
                                <li className="menu-item">
                                    <a href="/api/text-to-speech/google-tts?text=Halo" target="_blank" className="menu-link">
                                        <div data-i18n="Google TTS">Google TTS</div>
                                        <div className="badge bg-label-primary fs-tiny rounded-pill ms-auto">Google</div>
                                    </a>
                                </li>
                            </ul>
                    </li>
                    <li className="menu-item">
                          <a href="javascript:void(0);" className="menu-link menu-toggle">
                              <i className="menu-icon tf-icons ri ri-video-ai-line"></i>
                              <div data-i18n="Pollinations AI">Pollinations AI</div>
                          </a>
                        <ul className="menu-sub">
                            <li className="menu-item">
                                <a href="/api/veo/generate?prompt=A majestic silver spaceship docking into a massive ring-shaped space station orbiting Saturn" target="_blank" className="menu-link">
                                    <div data-i18n="Veo Video (GET)">Veo Video (GET)</div>
                                    <div className="badge bg-label-info fs-tiny rounded-pill ms-auto">Text-to-Video</div>
                                </a>
                            </li>
                            <li className="menu-item">
                                <a href="/api/veo/generate?prompt=A cute anime girl with blue hair&model=seedance" target="_blank" className="menu-link">
                                    <div data-i18n="Seedance Video">Seedance Video</div>
                                    <div className="badge bg-label-success fs-tiny rounded-pill ms-auto">Alternative</div>
                                </a>
                            </li>
                        </ul>
                    </li>
                <li className="menu-item">
                    <a href="javascript:void(0);" className="menu-link menu-toggle">

                      <i className="menu-icon tf-icons ri ri-image-line"></i>
                      <div data-i18n="ePhoto360 Maker">ePhoto360</div>
                  </a>
                  <ul className="menu-sub">
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/glitchtext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Glitch Text">Glitch Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/writetext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Write Text">Write Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/advancedglow?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Advanced Glow">Advanced Glow</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/typographytext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Typography Text">Typography Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/pixelglitch?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Pixel Glitch">Pixel Glitch</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/neonglitch?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Neon Glitch">Neon Glitch</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/flagtext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Flag Text">Flag Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/flag3dtext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Flag 3D Text">Flag 3D Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/deletingtext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Deleting Text">Deleting Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/blackpinkstyle?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Blackpink Style">Blackpink Style</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/glowingtext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Glowing Text">Glowing Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/underwatertext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Underwater Text">Underwater Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/logomaker?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Logo Maker">Logo Maker</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/cartoonstyle?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Cartoon Style">Cartoon Style</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/papercutstyle?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Papercut Style">Papercut Style</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/watercolortext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Watercolor Text">Watercolor Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/effectclouds?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Effect Clouds">Effect Clouds</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/blackpinklogo?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Blackpink Logo">Blackpink Logo</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/gradienttext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Gradient Text">Gradient Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/summerbeach?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Summer Beach">Summer Beach</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/luxurygold?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Luxury Gold">Luxury Gold</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/multicoloredneon?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Multicolored Neon">Multicolored Neon</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/sandsummer?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Sand Summer">Sand Summer</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/galaxywallpaper?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Galaxy Wallpaper">Galaxy Wallpaper</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/1917style?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="1917 Style">1917 Style</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/makingneon?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Making Neon">Making Neon</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/royaltext?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Royal Text">Royal Text</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/freecreate?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Free Create">Free Create</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/galaxystyle?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Galaxy Style">Galaxy Style</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/maker/ephoto/lighteffects?text=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Light Effects">Light Effects</div>
                          </a>
                      </li>
                    </ul>
                </li>
                  <li className="menu-item">
                      <a href="javascript:void(0);" className="menu-link menu-toggle">
                          <i className="menu-icon tf-icons ri ri-font-size"></i>
                          <div data-i18n="Brat">Brat</div>
                      </a>
                      <ul className="menu-sub">
                            <li className="menu-item">
                                <a href="/api/maker/bratGif?text=Hello World" target="_blank" className="menu-link">
                                    <div data-i18n="Brat Gif">Brat Gif</div>
                                </a>
                            </li>
                            <li className="menu-item">
                                <a href="/api/maker/brat?text=Hello World" target="_blank" className="menu-link">
                                    <div data-i18n="Brat">Brat</div>
                                </a>
                            </li>
                      </ul>
                  </li>
                        <li className="menu-item">
                            <a href="javascript:void(0);" className="menu-link menu-toggle">
                                <i className="menu-icon tf-icons ri ri-openai-fill"></i>
                                <div data-i18n="OpenAI">OpenAI</div>
                            </a>
                            <ul className="menu-sub">
                                  <li className="menu-item">
                                      <a href="/api/openai/chatgpt?prompt=Who is the current president of Indonesia?" target="_blank" className="menu-link">
                                          <div data-i18n="ChatGPT AI">ChatGPT AI</div>
                                      </a>
                                  </li>
                            </ul>
                        </li>
                    <li className="menu-item">
                        <a href="javascript:void(0);" className="menu-link menu-toggle">
                            <i className="menu-icon tf-icons ri ri-magic-line"></i>
                            <div data-i18n="Maker">Maker</div>
                        </a>
                          <ul className="menu-sub">
                                <li className="menu-item">
                                    <a href="/api/maker/iqc?text=ehmmmm?&chatTime=11:02&statusBarTime=17:01&bubbleColor=%23272a2f&menuColor=%23272a2f&textColor=%23FFFFFF&fontName=Arial&signalName=Telkomsel" target="_blank" className="menu-link">
                                        <div data-i18n="Iphone Quoted Chat (IQC)">Iphone Quoted Chat (IQC)</div>
                                    </a>
                                </li>
                                <li className="menu-item">
                                    <a href="/api/maker/ff-lobby-gen?text=Vreden" target="_blank" className="menu-link">
                                        <div data-i18n="FF Lobby Generator">FF Lobby Generator</div>
                                        <div className="badge bg-label-info fs-tiny rounded-pill ms-auto">Lobby FF</div>
                                    </a>
                                </li>
                          </ul>
                    </li>
                <li className="menu-item">
                    <a href="javascript:void(0);" className="menu-link menu-toggle">
                        <i className="menu-icon tf-icons ri ri-search-eye-line"></i>
                        <div data-i18n="Stalker">Stalker</div>
                    </a>
                    <ul className="menu-sub">
                      <li className="menu-item">
                          <a href="/api/stalker/freefire?id=8540703236" target="_blank" className="menu-link">
                              <div data-i18n="Free Fire">Free Fire</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/stalker/instagram?username=yahyaalmthr" target="_blank" className="menu-link">
                              <div data-i18n="Instagram 1">Instagram 1</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/v2/stalker/instagram?username=yahyaalmthr" target="_blank" className="menu-link">
                              <div data-i18n="Instagram 2">Instagram 2</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/stalker/mobilelegends?id_game=109088431&id_zone=2558" target="_blank" className="menu-link">
                              <div data-i18n="Mobile Legends">Mobile Legends</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/stalker/pinterest?username=vreden" target="_blank" className="menu-link">
                              <div data-i18n="Pinterest">Pinterest</div>
                          </a>
                      </li>
                        <li className="menu-item">
                            <a href="/api/stalker/tiktok?username=yahyaalialmthr" target="_blank" className="menu-link">
                                <div data-i18n="TikTok">TikTok</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/stalker/roblox?username=berak5menit" target="_blank" className="menu-link">
                                <div data-i18n="Roblox Stalker (User)">Roblox Stalker (User)</div>
                            </a>
                        </li>
                        <li className="menu-item">
                            <a href="/api/stalker/roblox?account_uid=1" target="_blank" className="menu-link">
                                <div data-i18n="Roblox Stalker (ID)">Roblox Stalker (ID)</div>
                            </a>
                        </li>
                    </ul>
                </li>
              <li className="menu-item">
                  <a href="javascript:void(0);" className="menu-link menu-toggle">
                      <i className="menu-icon tf-icons ri ri-shuffle-line"></i>
                      <div data-i18n="Random">Random</div>
                  </a>
                  <ul className="menu-sub">
                      <li className="menu-item">
                          <a href="/api/random/hentai" target="_blank" className="menu-link">
                              <div data-i18n="Hentai">Hentai</div>
                          </a>
                      </li>
                  </ul>
              </li>
              <li className="menu-item">
                  <a href="javascript:void(0);" className="menu-link menu-toggle">
                      <i className="menu-icon tf-icons ri ri-tools-line"></i>
                      <div data-i18n="Tools">Tools</div>
                  </a>
                  <ul className="menu-sub">
                      <li className="menu-item">
                          <a href="/api/tools/checkdns?domain=vreden-api-root-page.vercel.app" target="_blank" className="menu-link">
                              <div data-i18n="Check DNS">Check DNS</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/checkhost?domain=https://vreden-api-root-page.vercel.app" target="_blank" className="menu-link">
                              <div data-i18n="Check Host">Check Host</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/checkping?domain=https://vreden-api-root-page.vercel.app" target="_blank" className="menu-link">
                              <div data-i18n="Check Ping">Check Ping</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/checktcp?domain=https://vreden-api-root-page.vercel.app" target="_blank" className="menu-link">
                              <div data-i18n="Check TCP">Check TCP</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/fakemail/create" target="_blank" className="menu-link">
                              <div data-i18n="Fakemail: Create">Fakemail: Create</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/fakemail/inbox?id=" target="_blank" className="menu-link">
                              <div data-i18n="Fakemail: Inbox">Fakemail: Inbox</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/fakenumber/country" target="_blank" className="menu-link">
                              <div data-i18n="Fakenumber: Country">Fakenumber: Country</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/fakenumber/number?id=at" target="_blank" className="menu-link">
                              <div data-i18n="Fakenumber: Number">Fakenumber: Number</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/fakenumber/message?number=" target="_blank" className="menu-link">
                              <div data-i18n="Fakenumber: Message">Fakenumber: Message</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/maps/koordinator?location=Semarang" target="_blank" className="menu-link">
                              <div data-i18n="Maps: koordinator">Maps: koordinator</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/maps/rute?dari=Surabaya&tujuan=Semarang" target="_blank" className="menu-link">
                              <div data-i18n="Maps: rute">Maps: rute</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/proxy?url=https://ipwho.is/?lang=id-ID&region=fr" target="_blank" className="menu-link">
                              <div data-i18n="Proxy">Proxy</div>
                          </a>
                      </li>
                      <li className="menu-item">
                          <a href="/api/tools/runcode?code=console.log('Hai+mantan')&language=nodejs" target="_blank" className="menu-link">
                              <div data-i18n="Runcode">Runcode</div>
                          </a>
                      </li>
                        <li className="menu-item">
                            <a href="/api/tools/screenshot?url=https://vreden-api-root-page.vercel.app&device=laptop&scrollgui=true" target="_blank" className="menu-link">
                                <div data-i18n="Screenshot Site">Screenshot Site</div>
                                <div className="badge bg-label-info fs-tiny rounded-pill ms-auto">New Params</div>
                            </a>
                        </li>

                              <li className="menu-item">
                                  <a href="/api/tools/shortlink?url=https://vreden-api-root-page.vercel.app&type=vurl" target="_blank" className="menu-link">
                                      <div data-i18n="Shortlink">Shortlink</div>
                                  </a>
                              </li>
                            </ul>

              </li>
              
              <li className="menu-header mt-7">
                <span className="menu-header-text">External Links</span>
              </li>
              <li className="menu-item">
                <a href="https://github.com/vsid-git-account" target="_blank" className="menu-link">
                  <i className="menu-icon tf-icons ri ri-github-line"></i>
                  <div data-i18n="GitHub">GitHub</div>
                </a>
              </li>
              <li className="menu-item">
                <a href="https://vercel.com" target="_blank" className="menu-link d-flex align-items-center">
                  <i className="menu-icon tf-icons ri ri-building-line"></i>
                  <svg width="14" height="14" viewBox="0 0 76 65" fill="currentColor" className="me-1"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/></svg>
                  <div data-i18n="Vercel">Vercel</div>
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
                  <div className="nav-item navbar-search-wrapper mb-0">
                    <a className="nav-item nav-link search-toggler px-0" href="javascript:void(0);">
                      <span className="d-inline-block text-body-secondary fw-normal" id="autocomplete"></span>
                    </a>
                  </div>
                </div>
                <ul className="navbar-nav flex-row align-items-center ms-md-auto">
                  <li className="nav-item dropdown me-sm-2 me-xl-0">
                    <a className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill" id="nav-theme" href="javascript:void(0);" data-bs-toggle="dropdown">
                      <i className="icon-base ri ri-sun-line icon-22px theme-icon-active"></i>
                      <span className="d-none ms-2" id="nav-theme-text">Toggle theme</span>
                    </a>
                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="nav-theme-text">
                      <li>
                        <button type="button" className="dropdown-item align-items-center active" data-bs-theme-value="light">
                          <span> <i className="icon-base ri ri-sun-line icon-md me-3"></i>Light</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="dropdown-item align-items-center" data-bs-theme-value="dark">
                          <span> <i className="icon-base ri ri-moon-clear-line icon-md me-3"></i>Dark</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" className="dropdown-item align-items-center" data-bs-theme-value="system">
                          <span> <i className="icon-base ri ri-computer-line icon-md me-3"></i>System</span>
                        </button>
                      </li>
                    </ul>
                  </li>
                  <li className="nav-item dropdown-shortcuts navbar-dropdown dropdown">
                    <a className="nav-link btn btn-text-secondary rounded-pill btn-icon dropdown-toggle hide-arrow" href="javascript:void(0);" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                      <i className='ri ri-star-smile-line ri ri-22px'></i>
                    </a>
                    <div className="dropdown-menu dropdown-menu-end py-0">
                      <div className="dropdown-menu-header border-bottom py-50">
                        <div className="dropdown-header d-flex align-items-center py-2">
                            <h6 className="mb-0 me-auto">Vallzx Service</h6>
                          <a href="javascript:void(0)" className="btn btn-text-secondary rounded-pill btn-icon dropdown-shortcuts-add"><i className="ri ri-layout-grid-line ri ri-24px text-heading"></i></a>
                        </div>
                      </div>
                      <div className="dropdown-shortcuts-list scrollable-container">
                        <div className="row row-bordered overflow-visible g-0">
                          <div className="dropdown-shortcuts-item col">
                            <span className="dropdown-shortcuts-icon rounded-circle mb-2">
                              <i className="ri ri-dashboard-line ri ri-26px text-heading"></i>
                            </span>
                            <a href="https://vreden-api-root-page.vercel.app" className="stretched-link" target="_blank">Homepage</a>
                            <small>Official Website</small>
                          </div>
                          <div className="dropdown-shortcuts-item col">
                            <span className="dropdown-shortcuts-icon rounded-circle mb-2">
                              <i className="ri ri-youtube-line ri ri-26px text-heading"></i>
                            </span>
                            <a href="https://vreden-api-root-page.vercel.app" className="stretched-link" target="_blank">YouTube</a>
                            <small>Downloader & Info</small>
                          </div>
                        </div>
                        <div className="row row-bordered overflow-visible g-0">
                          <div className="dropdown-shortcuts-item col">
                            <span className="dropdown-shortcuts-icon rounded-circle mb-2">
                              <i className="ri ri-brush-line ri ri-26px text-heading"></i>
                            </span>
                            <a href="https://vreden-api-root-page.vercel.app" className="stretched-link" target="_blank">Canvas Editor</a>
                            <small>Editor Image canvas</small>
                          </div>
                          <div className="dropdown-shortcuts-item col">
                            <span className="dropdown-shortcuts-icon rounded-circle mb-2">
                              <i className="ri ri-server-line ri ri-26px text-heading"></i>
                            </span>
                            <a href="https://vreden-api-root-page.vercel.app" className="stretched-link" target="_blank">Rest API</a>
                            <small>Rest Api Free</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li className="nav-item dropdown-notifications navbar-dropdown dropdown me-4 me-xl-1">
                    <a className="nav-link btn btn-text-secondary rounded-pill btn-icon dropdown-toggle hide-arrow" href="javascript:void(0);" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                      <i className="ri ri-notification-2-line ri ri-22px"></i>
                      <span className="position-absolute top-0 start-50 translate-middle-y badge badge-dot bg-danger mt-2 border"></span>
                    </a>
                    <ul className="dropdown-menu dropdown-menu-end py-0">
                      <li className="dropdown-menu-header border-bottom">
                        <div className="dropdown-header d-flex align-items-center py-3">
                          <h6 className="mb-0 me-auto">Update And Notice</h6>
                          <div className="d-flex align-items-center">
                            <span className="badge rounded-pill bg-label-primary me-2">19 New</span>
                            <a href="javascript:void(0)" className="btn btn-text-secondary rounded-pill btn-icon dropdown-notifications-all"><i className="ri ri-mail-open-line ri ri-20px text-body"></i></a>
                          </div>
                        </div>
                      </li>
                      <li className="dropdown-notifications-list scrollable-container">
                        <ul className="list-group list-group-flush">
                          <li className="list-group-item list-group-item-action dropdown-notifications-item">
                            <div className="d-flex">
                              <div className="flex-shrink-0 me-3">
                                <div className="avatar">
                                  <span className="avatar-initial rounded-circle bg-label-danger"><i className="ri ri-notification-line"></i></span>
                                </div>
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="small mb-1">Stop Newsletter</h6>
                                <small className="mb-1 d-block text-body">Info update akan di kabari melalui channel, jadi banner ini hanya akan digunakan jika keadaan darurat</small>
                                <small className="text-muted">23 Maret 2025</small>
                              </div>
                              <div className="flex-shrink-0 dropdown-notifications-actions">
                                <a href="javascript:void(0)" className="dropdown-notifications-read"><span className="badge badge-dot"></span></a>
                                <a href="javascript:void(0)" className="dropdown-notifications-archive"><span className="ri ri-close-line"></span></a>
                              </div>
                            </div>
                          </li>
                          {/* More notifications items can be added here or dynamically */}
                          <li className="list-group-item list-group-item-action dropdown-notifications-item">
                            <div className="d-flex">
                              <div className="flex-shrink-0 me-3">
                                <div className="avatar">
                                  <span className="avatar-initial rounded-circle bg-label-success"><i className="ri ri-brain-line"></i></span>
                                </div>
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="small mb-1">Added Face Swap</h6>
                                <small className="mb-1 d-block text-body">Ganti muka di foto pakai muka kamu sendiri 🤫</small>
                                <small className="text-muted">21 Maret 2025</small>
                              </div>
                            </div>
                          </li>
                        </ul>
                      </li>
                      <li className="border-top">
                        <div className="d-grid p-4">
                          <a className="btn btn-primary btn-sm d-flex" href="https://whatsapp.com/channel/0029Vaf0HPMLdQeZsp3XRp2T" target="_blank">
                            <small className="align-middle">Join Channel Update</small>
                          </a>
                        </div>
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
                  <div className="col-md-12 col-lg-4">
                    <div className="card">
                      <div className="card-body text-nowrap">
                        <h5 className="card-title mb-0 flex-wrap text-nowrap">Welcome user! 🎉</h5>
                          <p className="mb-2">To Vallzx APIs</p>
                        <h4 className="text-primary mb-0" id="visitors">{stats.total_visitors}</h4>
                        <p className="mb-2">Total visitor 🚀</p>
                        <a href="https://whatsapp.com/channel/0029Vaf0HPMLdQeZsp3XRp2T" className="btn btn-sm btn-primary" target="_blank">Join Channel</a>
                      </div>
                      <img src="https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png" className="position-absolute bottom-0 end-0 me-5 mb-5" width="83" alt="Vreden Apis" />
                    </div>
                  </div>
                    <div className="col-lg-8">
                      <div className="card h-100">
                        <div className="card-header">
                          <div className="d-flex align-items-center justify-content-between">
                            <h5 className="card-title m-0 me-2">Penggunaan</h5>
                            <div className="d-flex align-items-center">
                              <span className={`badge ${realtimeStatus === 'connected' ? 'bg-success' : realtimeStatus === 'connecting' ? 'bg-warning' : 'bg-danger'} rounded-pill d-flex align-items-center`}>
                                <span className={`me-1 ${realtimeStatus === 'connected' ? 'bg-success' : realtimeStatus === 'connecting' ? 'bg-warning' : 'bg-danger'}`} style={{ width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', animation: realtimeStatus === 'connected' ? 'pulse 2s infinite' : 'none' }}></span>
                                {realtimeStatus === 'connected' ? 'Real-time' : realtimeStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                              </span>
                            </div>
                          </div>
                          <p className="small mb-0">
                            <span className="h6 mb-0">Request statistik</span> for this API
                          </p>
                        </div>
                      <div className="card-body pt-lg-10">
                        <div className="row g-6">
                          <div className="col-md-3 col-6">
                            <div className="d-flex align-items-center">
                              <div className="avatar">
                                <div className="avatar-initial bg-label-primary rounded shadow-xs">
                                  <i className="icon-base ri ri-pie-chart-2-line ri ri-24px"></i>
                                </div>
                              </div>
                              <div className="ms-3">
                                <p className="mb-0">Request</p>
                                <h5 className="mb-0" id="total-hits">{stats.total_hits}</h5>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-3 col-6">
                            <div className="d-flex align-items-center">
                              <div className="avatar">
                                <div className="avatar-initial bg-label-info rounded shadow-xs">
                                  <i className="icon-base ri ri-group-line ri ri-24px"></i>
                                </div>
                              </div>
                              <div className="ms-3">
                                <p className="mb-0">Visitor</p>
                                <h5 className="mb-0" id="total-visitors">{stats.total_visitors}</h5>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-3 col-6">
                            <div className="d-flex align-items-center">
                              <div className="avatar">
                                <div className="avatar-initial bg-label-success rounded shadow-xs">
                                  <i className="icon-base ri ri-checkbox-circle-line ri ri-24px"></i>
                                </div>
                              </div>
                              <div className="ms-3">
                                <p className="mb-0">Success</p>
                                <h5 className="mb-0" id="successful-requests">{stats.total_success}</h5>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-3 col-6">
                            <div className="d-flex align-items-center">
                              <div className="avatar">
                                <div className="avatar-initial bg-label-danger rounded shadow-xs">
                                  <i className="icon-base ri ri-bug-line ri ri-24px"></i>
                                </div>
                              </div>
                              <div className="ms-3">
                                <p className="mb-0">Failed</p>
                                <h5 className="mb-0" id="total-errors">{stats.total_errors}</h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-xl-4 col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <div className="d-flex align-items-center justify-content-between">
                          <h5 className="card-title m-0 me-2">Persentase</h5>
                        </div>
                        <p className="small mb-0">
                          <span className="h6 mb-0">APIs healthy</span> for router response.
                        </p>
                      </div>
                      <div className="card-body d-flex flex-column justify-content-between">
                        <div id="persentSuccess"></div>
                        <div className="text-center">
                          <p className="mb-2">Persent Rate</p>
                          <div className="badge bg-label-primary rounded-pill">Task Success</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-xl-4 col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <div className="d-flex justify-content-between">
                          <h5 className="mb-1">Statistics</h5>
                        </div>
                      </div>
                      <div className="card-body pt-lg-2">
                        <div id="weeklyOverviewChart"></div>
                        <div className="mt-1 mt-md-3">
                          <div className="d-flex align-items-center gap-4">
                            <h4 className="mb-0" id="total-weekly">0</h4>
                            <p className="mb-0">Total hit weekly and statistics</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xl-4 col-md-6">
                    <div className="card-group">
                      <div className="card mb-0">
                        <div className="card-body card-separator">
                          <div className="d-flex justify-content-between align-items-center flex-wrap mb-2">
                            <h5 className="m-0 me-2">Latest Usage</h5>
                          </div>
                            <div id="usage-content" className="p-0 m-0">
                              <div id="usage-list" className="row g-4 p-0 m-0 list-items">
                                {usageList.map((item, idx) => (
                                  <div key={idx} className="col-12 d-flex justify-content-between align-items-center">
                                    <div className="flex-grow-1 me-3" style={{ minWidth: 0 }}>
                                      <div className="d-flex align-items-center">
                                        <img 
                                          src={`https://cdn.ipwhois.io/flags/${item.info?.country?.iso_code?.toLowerCase() || 'un'}.svg`} 
                                          height="20" width="20" 
                                          className="me-2 rounded-circle border border-2 flex-shrink-0"
                                          alt="flag"
                                        />
                                        <div className="w-100" style={{ minWidth: 0 }}>
                                          <div className="fs-7 fw-semibold text-solid-theme text-truncate">
                                            <span className={`text-solid-${item.method === 'GET' ? 'success' : item.method === 'POST' ? 'danger' : 'primary'}`}>{item.method}</span> 
                                            {" "}{item.router.replace("/api/v1", "").replace("/api/v2", "")}
                                          </div>
                                          <div className="fs-tiny text-secondary text-truncate">
                                            {item.info?.traits?.organization || 'Unknown'} • {item.device} • {item.timestamp}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 text-end">
                                      <div className={`badge rounded-2 bg-solid-${item.status === 200 ? 'success' : item.status === 400 || item.status === 404 ? 'secondary' : item.status === 500 ? 'danger' : 'primary'} fs-micro`}>{item.status}</div>
                                      <div className="fs-tiny text-secondary">{item.date_now.split(" ")[1]}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xl-4 col-md-6">
                    <div className="card-group">
                      <div className="card mb-0">
                        <div className="card-body card-separator">
                          <div className="d-flex justify-content-between align-items-center flex-wrap mb-2">
                            <h5 className="m-0 me-2">Latest Error</h5>
                          </div>
                            <div id="error-content" className="p-0 m-0">
                              <div id="error-list" className="row g-4 p-0 m-0 list-items">
                                {errorList.map((item, idx) => (
                                  <div key={idx} className="col-12 d-flex justify-content-between align-items-center">
                                    <div className="flex-grow-1 me-3" style={{ minWidth: 0 }}>
                                      <div className="d-flex align-items-center">
                                        <img 
                                          src={`https://cdn.ipwhois.io/flags/${item.info?.country?.iso_code?.toLowerCase() || 'un'}.svg`} 
                                          height="20" width="20" 
                                          className="me-2 rounded-circle border border-2 flex-shrink-0"
                                          alt="flag"
                                        />
                                        <div className="w-100" style={{ minWidth: 0 }}>
                                          <div className="fs-7 fw-semibold text-solid-theme text-truncate">
                                            <span className={`text-solid-${item.method === 'GET' ? 'success' : item.method === 'POST' ? 'danger' : 'primary'}`}>{item.method}</span> 
                                            {" "}{item.router.replace("/api/v1", "").replace("/api/v2", "")}
                                          </div>
                                          <div className="fs-tiny text-secondary text-truncate">
                                            {item.info?.traits?.organization || 'Unknown'} • {item.device} • {item.timestamp}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 text-end">
                                      <div className={`badge rounded-2 bg-solid-${item.status === 200 ? 'success' : item.status === 400 || item.status === 404 ? 'secondary' : item.status === 500 ? 'danger' : 'primary'} fs-micro`}>{item.status}</div>
                                      <div className="fs-tiny text-secondary">{item.date_now.split(" ")[1]}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                        </div>
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
                      <span className="mb-2 fs-tiny">PT Cindigital Multisystem Cloud</span>
                    </div>
                  </div>
                </footer>
              </div>
            </div>
          </div>
          <div className="layout-overlay layout-menu-toggle"></div>
          <div className="drag-target"></div>
        </div>
      </div>
    </>
  );
}
