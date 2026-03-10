// Device information utilities for SUB STREAM auth security

const DEVICE_ID_KEY = "substream_device_id";
const KNOWN_DEVICES_KEY = "substream_known_devices";

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        // Fallback UUID-like generation
        id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}

export function getDeviceModel(): string {
  try {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return "iPhone";
    if (/iPad/.test(ua)) return "iPad";
    if (/Android/.test(ua)) {
      const match = ua.match(/Android[^;]*;\s*([^)]+)/);
      return match ? match[1].trim() : "Android Device";
    }
    if (/Macintosh/.test(ua)) return "Mac";
    if (/Windows/.test(ua)) return "Windows PC";
    if (/Linux/.test(ua)) return "Linux PC";
    return "Unknown Device";
  } catch {
    return "Unknown Device";
  }
}

export interface DeviceInfo {
  device_id: string;
  ip_address: string;
  device_model: string;
}

export function getDeviceInfo(): DeviceInfo {
  return {
    device_id: getDeviceId(),
    ip_address: "auto-detected",
    device_model: getDeviceModel(),
  };
}

export function storeKnownDevice(email: string): void {
  try {
    const raw = localStorage.getItem(KNOWN_DEVICES_KEY);
    const devices: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const deviceId = getDeviceId();
    if (!devices[email]) {
      devices[email] = [];
    }
    if (!devices[email].includes(deviceId)) {
      devices[email].push(deviceId);
    }
    localStorage.setItem(KNOWN_DEVICES_KEY, JSON.stringify(devices));
  } catch {
    // silent
  }
}

export function isKnownDevice(email: string): boolean {
  try {
    const raw = localStorage.getItem(KNOWN_DEVICES_KEY);
    if (!raw) return false;
    const devices: Record<string, string[]> = JSON.parse(raw);
    const deviceId = getDeviceId();
    return (devices[email] ?? []).includes(deviceId);
  } catch {
    return false;
  }
}
