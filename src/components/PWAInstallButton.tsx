import { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/95 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow"
      >
        <Download className="w-4 h-4" />
        <span>{isIOS ? 'Install (iOS)' : 'Install App'}</span>
      </button>

      {showGuide && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl bg-[#0d1219] border border-white/15 p-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Install Bermuda Strike 3D</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                1. Safari ke niche <strong>Share</strong> button par tap karein.<br />
                2. Niche scroll karke <strong>Add to Home Screen</strong> par tap karein.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-300">
                <p>
                  Yeh ek <strong>Web Game (PWA)</strong> hai, direct raw <code className="text-amber-300">.apk</code> file nahi — isliye AI Studio preview ke andar APK Extractor kaam nahi karta.
                </p>
                <p>
                  Phone par app ki tarah install karne ke liye:
                  <br />1. Upar diye <strong>Shared App Link</strong> ko seedhe <strong>Chrome browser</strong> mein kholein (preview frame ke bahar).
                  <br />2. Chrome ke top-right <strong>⋮ (3 dots)</strong> menu mein jaakar <strong>Install app</strong> ya <strong>Add to Home screen</strong> par tap karein.
                  <br />3. Chrome isse Android par real app (WebAPK) ke roop mein install kar dega!
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-white cursor-pointer"
            >
              Samajh Gaya
            </button>
          </div>
        </div>
      )}
    </>
  );
}
