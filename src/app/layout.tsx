import type { Metadata } from "next";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Vallzx APIs - Layanan RestAPI by Vallzx",
  description: "Vallzx API provides various JSON APIs for JavaScript applications including downloaders, social media tools, search functions, converters, and other utilities.",
  keywords: ["vallzx api", "json api", "javascript api", "downloader api", "social media api", "converter api", "whatsapp bot", "baileys api", "chat api"],
  alternates: {
    canonical: "https://api.vreden.my.id",
  },
  icons: {
    icon: "https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png",
  },
  robots: "index, follow",
  authors: [{ name: "Vallzx" }],
  openGraph: {
    title: "Vallzx APIs - Layanan RestAPI by Vallzx",
    description: "Vallzx API provides various JSON APIs for JavaScript applications including downloaders, social media tools, search functions, converters, and other utilities.",
    url: "https://api.vreden.my.id",
    siteName: "Vallzx APIs",
    type: "website",
    images: [
      {
        url: "https://visora-dev-assets-id.assetsvsiddev.workers.dev/small-favicon/favicon-small.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="layout-navbar-fixed layout-wide" dir="ltr" data-skin="default" data-bs-theme="light" data-assets-path="https://api.vreden.my.id/assets/" data-template="front-pages">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/fonts/iconify-icons.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/node-waves/node-waves.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/pickr/pickr-themes.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/nouislider/nouislider.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/swiper/swiper.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/css/core.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/css/pages/front-page.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/vendor/css/pages/front-page-landing.css" />
        <link rel="stylesheet" href="https://api.vreden.my.id/assets/css/demo.css" />
      </head>
      <body className="antialiased">
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="9ef87a07-1933-4636-aa93-88279bcdc77c"
        />
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        
        <Script src="https://api.vreden.my.id/assets/vendor/js/helpers.js" strategy="beforeInteractive" />
        <Script src="/js/customizer.js" strategy="beforeInteractive" />
        <Script src="https://api.vreden.my.id/assets/js/front-config.js" strategy="beforeInteractive" />
        
        <Script src="https://api.vreden.my.id/assets/vendor/js/dropdown-hover.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/vendor/js/mega-dropdown.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/vendor/libs/popper/popper.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/vendor/js/bootstrap.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/vendor/libs/node-waves/node-waves.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/vendor/libs/pickr/pickr.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/vendor/libs/nouislider/nouislider.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/vendor/libs/swiper/swiper.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/js/front-main.js" strategy="afterInteractive" />
        <Script src="https://api.vreden.my.id/assets/js/front-page-landing.js" strategy="afterInteractive" />
        
        <Script id="customizer-loading-script" strategy="afterInteractive">{`
          (function() {
            function addLoadingToCustomizer() {
              var customizer = document.getElementById('template-customizer');
              if (customizer && !document.getElementById('customizer-loading-overlay')) {
                var overlay = document.createElement('div');
                overlay.id = 'customizer-loading-overlay';
                overlay.innerHTML = '<div class="customizer-spinner"><svg class="circular" viewBox="25 25 50 50"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-miterlimit="10"/></svg></div>';
                customizer.insertBefore(overlay, customizer.firstChild);
                
                setTimeout(function() {
                  overlay.classList.add('hidden');
                  setTimeout(function() {
                    overlay.remove();
                  }, 300);
                }, 800);
              }
            }
            
            var openBtn = null;
            var checkInterval = setInterval(function() {
              openBtn = document.querySelector('.template-customizer-open-btn');
              if (openBtn) {
                clearInterval(checkInterval);
                openBtn.addEventListener('click', function() {
                  setTimeout(addLoadingToCustomizer, 50);
                });
              }
            }, 100);
            
            setTimeout(function() { clearInterval(checkInterval); }, 10000);
          })();
        `}</Script>
        
        <Script id="primary-color-changer" strategy="afterInteractive">{`
          (function() {
            function hexToRgb(hex) {
              var result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
              return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
              } : null;
            }
            
            function applyPrimaryColor(color) {
              var root = document.documentElement;
              var rgb = hexToRgb(color);
              if (rgb) {
                root.style.setProperty('--bs-primary', color);
                root.style.setProperty('--bs-primary-rgb', rgb.r + ',' + rgb.g + ',' + rgb.b);
                
                var styleEl = document.getElementById('dynamic-primary-color');
                if (!styleEl) {
                  styleEl = document.createElement('style');
                  styleEl.id = 'dynamic-primary-color';
                  document.head.appendChild(styleEl);
                }
                styleEl.textContent = ':root { --bs-primary: ' + color + ' !important; --bs-primary-rgb: ' + rgb.r + ',' + rgb.g + ',' + rgb.b + ' !important; } ' +
                  '.btn-primary { background-color: ' + color + ' !important; border-color: ' + color + ' !important; } ' +
                  '.bg-primary { background-color: ' + color + ' !important; } ' +
                  '.text-primary { color: ' + color + ' !important; } ' +
                  '.border-primary { border-color: ' + color + ' !important; } ' +
                  'a.text-primary:hover { color: ' + color + ' !important; } ' +
                  '.bg-label-primary { background-color: rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ', 0.16) !important; color: ' + color + ' !important; } ' +
                  '.bg-label-primary i { color: ' + color + ' !important; } ' +
                  '.badge.bg-label-primary { background-color: rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ', 0.16) !important; color: ' + color + ' !important; } ' +
                  '.fun-facts-icon.bg-label-primary { background-color: rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ', 0.16) !important; } ' +
                  '.fun-facts-icon.bg-label-primary i { color: ' + color + ' !important; } ' +
                  '.card.border-primary { border-color: ' + color + ' !important; } ' +
                  '.btn-outline-primary { color: ' + color + ' !important; border-color: ' + color + ' !important; } ' +
                  '.btn-outline-primary:hover { background-color: ' + color + ' !important; border-color: ' + color + ' !important; color: #fff !important; } ' +
                  '#template-customizer .custom-option.checked { border-color: ' + color + ' !important; } ' +
                  '#template-customizer .custom-option-image.checked .custom-option-body svg { border: 2px solid ' + color + ' !important; border-radius: 6px !important; } ' +
                  '#template-customizer .custom-option-icon.checked { border-color: ' + color + ' !important; color: ' + color + ' !important; } ' +
                  '#template-customizer .custom-option-icon.checked .custom-option-body { color: ' + color + ' !important; } ' +
                  '#template-customizer .custom-option-icon.checked .custom-option-body i { color: ' + color + ' !important; }';
              }
            }
            
            function addCustomizerFooter() {
              var customizer = document.getElementById('template-customizer');
              if (customizer && !document.getElementById('customizer-footer-copyright')) {
                var inner = customizer.querySelector('.template-customizer-inner');
                if (inner) {
                  var footer = document.createElement('div');
                  footer.id = 'customizer-footer-copyright';
                  footer.style.cssText = 'padding: 20px 24px; text-align: center; font-size: 12px; color: #697a8d; border-top: 1px solid rgba(0,0,0,0.08);';
                  footer.innerHTML = '© Visora Teams Indonesia | 2026';
                  inner.appendChild(footer);
                }
              }
            }
            
            var savedColor = localStorage.getItem('templateCustomizer-front-pages--Color');
            if (savedColor) {
              applyPrimaryColor(savedColor);
            }
            
            if (window.Helpers && !window.Helpers._originalSetColor) {
              window.Helpers._originalSetColor = window.Helpers.setColor;
              window.Helpers.setColor = function(color, save) {
                applyPrimaryColor(color);
                if (window.Helpers._originalSetColor) {
                  window.Helpers._originalSetColor(color, save);
                }
              };
            }
            
            var colorInterval = setInterval(function() {
              var colorOptions = document.querySelectorAll('.template-customizer-colors-options input[type="radio"]');
              if (colorOptions.length > 0) {
                clearInterval(colorInterval);
                colorOptions.forEach(function(input) {
                  input.addEventListener('change', function(e) {
                    if (e.target.dataset.color) {
                      applyPrimaryColor(e.target.dataset.color);
                    }
                  });
                });
              }
            }, 500);
            
            setTimeout(function() { clearInterval(colorInterval); }, 15000);
            
            var footerInterval = setInterval(function() {
              var customizer = document.getElementById('template-customizer');
              if (customizer && customizer.classList.contains('template-customizer-open')) {
                addCustomizerFooter();
              }
            }, 300);
            
            var openBtnCheck = setInterval(function() {
              var openBtn = document.querySelector('.template-customizer-open-btn');
              if (openBtn) {
                clearInterval(openBtnCheck);
                openBtn.addEventListener('click', function() {
                  setTimeout(addCustomizerFooter, 500);
                });
              }
            }, 200);
            
            setTimeout(function() { 
              clearInterval(openBtnCheck);
              clearInterval(footerInterval);
            }, 30000);
          })();
        `}</Script>

        {children}
        
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
