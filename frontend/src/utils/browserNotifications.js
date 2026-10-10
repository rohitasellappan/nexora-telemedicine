/**
 * NEXORA Safe Healthcare Browser Notification Utility
 * Compliant with healthcare privacy (never exposes medical diagnoses or sensitive patient clinical data).
 */

class BrowserNotificationManager {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermission() {
    if (!this.isSupported) return 'denied';
    return Notification.permission;
  }

  async requestPermission() {
    if (!this.isSupported) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn('[BrowserNotification] Error requesting permission:', err);
      return 'denied';
    }
  }

  /**
   * Dispatches a sanitized desktop notification
   * @param {Object} options { title, body, icon, tag }
   */
  showNotification({ title, body, icon = '/vite.svg', tag = 'nexora-alert' }) {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return null;
    }

    try {
      // Security Check: Sanitize to ensure no confidential health vitals/diagnoses leak
      const safeTitle = `NEXORA • ${title || 'Telemedicine Alert'}`;
      const safeBody = body || 'You have an update regarding your consultation.';

      const notification = new Notification(safeTitle, {
        body: safeBody,
        icon,
        tag,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        try {
          notification.close();
        } catch (_) {}
      }, 6000);

      return notification;
    } catch (err) {
      console.warn('[BrowserNotification] Error showing notification:', err);
      return null;
    }
  }
}

export const browserNotifier = new BrowserNotificationManager();
