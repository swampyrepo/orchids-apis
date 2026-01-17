"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Chart: any;
  }
}

export default function MonitorPage() {
  const [stats, setStats] = useState<any>(null);
  const [persistentRequests, setPersistentRequests] = useState<any[]>([]);
  const chartsRef = useRef<any>({});
  const dataRef = useRef<any>({
    memoryData: Array(60).fill(0),
    cpuData: Array(60).fill(0),
    requestRateData: Array(60).fill(0),
    responseTimeData: Array(60).fill(0),
    networkDownData: Array(60).fill(0),
    networkUpData: Array(60).fill(0),
    timeLabels: Array(60).fill(''),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load persistence data on mount
  useEffect(() => {
    const savedData = localStorage.getItem("monitor_chart_data");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        dataRef.current = { ...dataRef.current, ...parsed };
      } catch (e) {
        console.error("Failed to parse saved chart data", e);
      }
    }

    const savedRequests = localStorage.getItem("monitor_persistent_requests");
    if (savedRequests) {
      try {
        setPersistentRequests(JSON.parse(savedRequests));
      } catch (e) {
        console.error("Failed to parse saved requests", e);
      }
    }
  }, []);

  const updateCharts = useCallback((newStats: any) => {
    if (!newStats) return;

    const now = new Date().toLocaleTimeString();
    const d = dataRef.current;

    d.timeLabels.shift(); d.timeLabels.push(now);
    d.memoryData.shift(); d.memoryData.push(parseFloat(newStats.system.memory.usagePercent) || 0);
    d.cpuData.shift(); d.cpuData.push(parseFloat(newStats.system.cpu.usage) || 0);
    d.requestRateData.shift(); d.requestRateData.push(parseFloat(newStats.requests.perSecond) || 0);
    d.responseTimeData.shift(); d.responseTimeData.push(newStats.overallAvgResponseTime || 0);
    d.networkDownData.shift(); d.networkDownData.push(newStats.network.download.speedRaw || 0);
    d.networkUpData.shift(); d.networkUpData.push(newStats.network.upload.speedRaw || 0);

    // Save chart data to localStorage
    localStorage.setItem("monitor_chart_data", JSON.stringify(d));

    // Update charts if they exist
    Object.values(chartsRef.current).forEach((chart: any) => {
      if (chart && typeof chart.update === 'function') {
        chart.update('none');
      }
    });

    if (newStats.requests.daily && chartsRef.current.historyChart) {
      const dates = Object.keys(newStats.requests.daily);
      const values = Object.values(newStats.requests.daily);
      chartsRef.current.historyChart.data.labels = dates;
      chartsRef.current.historyChart.data.datasets[0].data = values;
      chartsRef.current.historyChart.data.datasets[1].data = values;
      chartsRef.current.historyChart.update('none');
    }

    if (newStats.enhanced.responseTimeDistribution && chartsRef.current.responseDistChart) {
      const dist = newStats.enhanced.responseTimeDistribution;
      chartsRef.current.responseDistChart.data.datasets[0].data = [dist.fast, dist.medium, dist.slow, dist.verySlow];
      chartsRef.current.responseDistChart.update('none');
    }

    if (newStats.enhanced.methodDistribution && chartsRef.current.methodChart) {
      const methods = Object.keys(newStats.enhanced.methodDistribution);
      const counts = Object.values(newStats.enhanced.methodDistribution);
      chartsRef.current.methodChart.data.labels = methods;
      chartsRef.current.methodChart.data.datasets[0].data = counts;
      chartsRef.current.methodChart.update('none');
    }

    // Handle persistent requests deduplication and merging
    if (newStats.enhanced.recentRequests) {
      setPersistentRequests(prev => {
        const newOnes = newStats.enhanced.recentRequests;
        // Deduplicate based on a unique fingerprint (timestamp + endpoint + ip)
        const combined = [...newOnes, ...prev];
        const seen = new Set();
        const unique = combined.filter(req => {
          const fingerprint = `${req.timestamp || ''}-${req.endpoint}-${req.maskedIp}-${req.duration}`;
          if (seen.has(fingerprint)) return false;
          seen.add(fingerprint);
          return true;
        });
        const limited = unique.slice(0, 50); // Keep last 50
        localStorage.setItem("monitor_persistent_requests", JSON.stringify(limited));
        return limited;
      });
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/monitor");
        const data = await res.json();
        if (data.stats) {
          setStats(data.stats);
          updateCharts(data.stats);
        }
      } catch (err) {
        console.error("Failed to fetch monitor stats:", err);
      }
    };

    const interval = setInterval(fetchStats, 3000);
    fetchStats();
    return () => clearInterval(interval);
  }, [updateCharts]);

  const initCharts = useCallback(() => {
    if (!window.Chart) return;

    const Chart = window.Chart;
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Montserrat', sans-serif";

    const commonChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { padding: 10 } },
        x: { grid: { display: false }, ticks: { padding: 10, maxTicksLimit: 10 } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.9)',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
        }
      }
    };

    const createChart = (id: string, config: any) => {
      const el = document.getElementById(id) as HTMLCanvasElement;
      if (!el) return null;
      if (chartsRef.current[id]) {
        chartsRef.current[id].destroy();
      }
      return new Chart(el, config);
    };

    chartsRef.current.systemChart = createChart('systemChart', {
      type: 'line',
      data: {
        labels: dataRef.current.timeLabels,
        datasets: [
          { label: 'Memory Usage', data: dataRef.current.memoryData, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: true },
          { label: 'CPU Usage', data: dataRef.current.cpuData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: true }
        ]
      },
      options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, max: 100 } }, plugins: { ...commonChartOptions.plugins, legend: { display: true, position: 'top' } } }
    });

    chartsRef.current.requestChart = createChart('requestChart', {
      type: 'line',
      data: {
        labels: dataRef.current.timeLabels,
        datasets: [{ label: 'Requests/Second', data: dataRef.current.requestRateData, borderColor: '#f85149', backgroundColor: 'rgba(248,81,73,0.1)', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: true }]
      },
      options: commonChartOptions
    });

    chartsRef.current.responseChart = createChart('responseChart', {
      type: 'line',
      data: {
        labels: dataRef.current.timeLabels,
        datasets: [{ label: 'Avg Response Time (ms)', data: dataRef.current.responseTimeData, borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.1)', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: true }]
      },
      options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, ticks: { callback: (v: any) => v + ' ms' } } } }
    });

    chartsRef.current.networkChart = createChart('networkChart', {
      type: 'line',
      data: {
        labels: dataRef.current.timeLabels,
        datasets: [
          { label: 'Download', data: dataRef.current.networkDownData, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: true },
          { label: 'Upload', data: dataRef.current.networkUpData, borderColor: '#fb923c', backgroundColor: 'rgba(251,146,60,0.1)', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: true }
        ]
      },
      options: { ...commonChartOptions, plugins: { ...commonChartOptions.plugins, legend: { display: true, position: 'top' } } }
    });

    chartsRef.current.historyChart = createChart('historyChart', {
      type: 'bar',
      data: { labels: [], datasets: [
        { label: 'Total Requests', data: [], backgroundColor: 'rgba(96,165,250,0.8)', borderColor: '#60a5fa', borderWidth: 1 },
        { label: 'API Requests', data: [], backgroundColor: 'rgba(129,140,248,0.8)', borderColor: '#818cf8', borderWidth: 1 }
      ]},
      options: { ...commonChartOptions, plugins: { ...commonChartOptions.plugins, legend: { display: true, position: 'top' } } }
    });

    chartsRef.current.responseDistChart = createChart('responseDistChart', {
      type: 'doughnut',
      data: { labels: ['Fast (<10ms)', 'Medium (10-50ms)', 'Slow (50-100ms)', 'Very Slow (>100ms)'], datasets: [{ data: [0,0,0,0], backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom' } } }
    });

    chartsRef.current.methodChart = createChart('methodChart', {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom' } } }
    });
  }, []);

  const apiStats = stats ? Object.entries(stats.apiStats).sort((a: any, b: any) => (b[1] as any).totalRequests - (a[1] as any).totalRequests) : [];
  const currentApiStats = apiStats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(apiStats.length / itemsPerPage);

  return (
    <>
      <style jsx global>{`
        body {
          font-family: 'Montserrat', sans-serif;
          background: linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          color: #e2e8f0;
          min-height: 100vh;
        }
        .glass-effect {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
        }
        .chart-wrapper {
          height: 320px;
          width: 100%;
        }
        .metric-card {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .metric-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.35);
        }
        .card-icon {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .metric-card:hover .card-icon {
          transform: scale(1.2) rotate(12deg);
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.6; }
        }
        .live-indicator {
          animation: pulse 2.5s infinite;
        }
        .gradient-text {
          background: linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
          .glow {
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at center, rgba(96, 165, 250, 0.15) 0%, transparent 75%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .metric-card:hover .glow {
          opacity: 1;
        }
        .history-chart {
          height: 250px;
        }
        .recent-request {
          transition: all 0.3s ease;
          border-left: 3px solid transparent;
        }
        .recent-request:hover {
          border-left-color: #60a5fa;
          background: rgba(96, 165, 250, 0.05);
        }
        .status-success { color: #10b981; }
        .status-error { color: #ef4444; }
        .status-warning { color: #f59e0b; }
      `}</style>

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"
        onLoad={initCharts}
      />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <Script src="https://cdn.tailwindcss.com" />

      <img
        src="https://api.vreden.my.id/assets/img/front-pages/backgrounds/hero-bg-light.png"
        alt="hero background"
        className="position-fixed top-0 start-0 w-100 h-100 z-n1 opacity-50"
        style={{ objectFit: 'cover' }}
      />

      <div className="min-h-screen p-4 md:p-8 pt-8 relative z-10">
          <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 live-indicator"></span>
                      Live Monitoring Dashboard
                    </p>
                  </div>
                </div>
            <div className="text-sm text-gray-400 glass-effect px-4 py-2 rounded-lg">
              {new Date().toLocaleString()}
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              <MetricCard title="Total Requests" value={stats?.requests.total || 0} icon="fas fa-network-wired" color="sky" />
              <MetricCard title="Total request on this day" value={stats?.requests.total_requests_today || 0} icon="fas fa-calendar-day" color="violet" />
              <MetricCard title="Requests/Second" value={stats?.requests.perSecond || 0} icon="fas fa-gauge-high" color="emerald" />
              <MetricCard title="Total Fitur" value={stats?.system.totalEndpoints || "-"} icon="fas fa-layer-group" color="amber" />
              <MetricCard title="API Total" value={stats?.requests.api.total || 0} icon="fas fa-server" color="indigo" />
              <MetricCard title="CPU Usage" value={(stats?.system.cpu.usage || 0) + "%"} icon="fas fa-microchip" color="red" />
              <MetricCard title="Network Down" value={stats?.network.download.speed || "0 MB/s"} icon="fas fa-download" color="cyan" />
              <MetricCard title="Network Up" value={stats?.network.upload.speed || "0 KB/s"} icon="fas fa-upload" color="orange" />
            </div>

          <div className="glass-effect rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-clock text-emerald-500"></i>
              Recent API Activity
              <span className="text-sm glass-effect px-2 py-1 rounded-lg ml-auto">Persisted</span>
            </h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {persistentRequests.length > 0 ? persistentRequests.map((req: any, i: number) => (
                <div key={`${i}-${req.endpoint}`} className="recent-request glass-effect p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${req.statusCode >= 200 && req.statusCode < 300 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <div>
                      <div className="text-sm font-medium text-white">{req.method} {req.endpoint}</div>
                      <div className="text-xs text-gray-400">{req.maskedIp} • {req.userAgent}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm ${req.statusCode >= 200 && req.statusCode < 300 ? 'status-success' : 'status-error'} font-medium`}>{req.statusCode}</div>
                    <div className="text-xs text-gray-400">{req.duration}ms</div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">No activity yet</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="glass-effect rounded-2xl p-4 md:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Request History (Last 10 Days)</h2>
              <div className="history-chart"><canvas id="historyChart"></canvas></div>
            </div>
            <div className="glass-effect rounded-2xl p-4 md:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Network Usage</h2>
              <div className="chart-wrapper"><canvas id="networkChart"></canvas></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <ChartContainer title="System Performance" id="systemChart" />
            <ChartContainer title="Request Rate" id="requestChart" />
            <ChartContainer title="Avg Response Time" id="responseChart" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="glass-effect rounded-2xl p-4 md:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Response Time Distribution</h2>
              <div className="chart-wrapper"><canvas id="responseDistChart"></canvas></div>
            </div>
            <div className="glass-effect rounded-2xl p-4 md:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Top User Agents</h2>
              <div className="space-y-3">
                {Object.entries(stats?.enhanced.topUserAgents || {}).sort((a: any, b: any) => (b[1] as any) - (a[1] as any)).slice(0, 5).map(([agent, count]: any, i) => (
                  <div key={i} className="flex items-center justify-between p-2 glass-effect rounded-lg">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-globe text-blue-400"></i>
                      <span className="text-white">{agent}</span>
                    </div>
                    <span className="text-gray-400">{(count as number).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-effect rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Request Methods Distribution</h2>
            <div className="chart-wrapper"><canvas id="methodChart"></canvas></div>
          </div>

          <div className="glass-effect rounded-2xl p-4 md:p-6 mt-6 md:mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">API Usage Ranking (Last 24 Hours)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-400">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-2 text-left">Rank</th>
                    <th className="px-4 py-2 text-left">Endpoint</th>
                    <th className="px-4 py-2 text-left">Total Requests</th>
                    <th className="px-4 py-2 text-left">Success</th>
                    <th className="px-4 py-2 text-left">Errors</th>
                    <th className="px-4 py-2 text-left">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {currentApiStats.map(([endpoint, data]: any, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                      <td className="px-4 py-2 font-mono">{endpoint}</td>
                      <td className="px-4 py-2">{data.totalRequests}</td>
                      <td className="px-4 py-2 text-emerald-400">{data.success}</td>
                      <td className="px-4 py-2 text-red-400">{data.errors}</td>
                      <td className="px-4 py-2">{data.successRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="glass-effect px-4 py-2 rounded-lg text-white disabled:opacity-50">
                <i className="fas fa-chevron-left mr-2"></i>Previous
              </button>
              <span className="text-gray-400">Page {currentPage} of {totalPages || 1}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="glass-effect px-4 py-2 rounded-lg text-white disabled:opacity-50">
                Next<i className="fas fa-chevron-right ml-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({ title, value, icon, color }: any) {
  const colorClasses: any = {
    sky: "text-sky-500 bg-sky-500/10",
    violet: "text-violet-500 bg-violet-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10",
    red: "text-red-500 bg-red-500/10",
    cyan: "text-cyan-500 bg-cyan-500/10",
    orange: "text-orange-500 bg-orange-500/10"
  };

  return (
    <div className="metric-card glass-effect rounded-2xl p-4 md:p-6">
      <div className="glow"></div>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
          <p className="text-xl md:text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={`card-icon ${colorClasses[color]} p-3 md:p-4 rounded-xl`}>
          <i className={`${icon} fa-lg`}></i>
        </div>
      </div>
    </div>
  );
}

function ChartContainer({ title, id }: any) {
  return (
    <div className="glass-effect rounded-2xl p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="text-sm glass-effect px-3 py-1 rounded-lg">
          <i className="fas fa-chart-line mr-2 text-sky-400"></i>Real-time
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas id={id}></canvas>
      </div>
    </div>
  );
}
