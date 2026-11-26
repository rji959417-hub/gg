import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar, Style } from '@capacitor/status-bar';

async function applyFullscreenLandscape(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.hide();
  } catch {
    // Ignore on platforms/OS versions that restrict specific status bar APIs
  }

  try {
    await ScreenOrientation.lock({ orientation: 'landscape' });
  } catch {
    // Orientation is also enforced natively in AndroidManifest.xml
  }
}

export function initNativeShell(): void {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  void applyFullscreenLandscape();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void applyFullscreenLandscape();
    }
  });
}
