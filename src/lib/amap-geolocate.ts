import { load } from "@amap/amap-jsapi-loader";

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

let aMapPromise: ReturnType<typeof load> | null = null;

type GeolocateResult = {
  position?: { getLat: () => number; getLng: () => number } | { lat: number; lng: number };
  message?: string;
  info?: string;
  originMessage?: string;
};

type AMapGeolocation = new (o: Record<string, unknown>) => {
  getCurrentPosition: (cb: (s: string, r: GeolocateResult) => void) => void;
};

type AMapApi = { Geolocation: AMapGeolocation };

function getKey(): string {
  const key = (import.meta.env.VITE_AMAP_KEY ?? "").trim();
  if (!key) {
    throw new Error(
      "未配置 VITE_AMAP_KEY。请在项目根目录添加 .env，配置高德 Web 端（JS API）Key 后重启开发服务。",
    );
  }
  return key;
}

function setSecurityConfig(): void {
  const code = (import.meta.env.VITE_AMAP_SECURITY_JS_CODE ?? "").trim();
  if (code) {
    window._AMapSecurityConfig = { securityJsCode: code };
  }
}

/**
 * 加载 AMap 2.0 与定位插件（单例）。安全密钥需在高德控制台与 Key
 * 成对使用，并写入 VITE_AMAP_SECURITY_JS_CODE。
 */
export function loadAmapWithGeolocation() {
  setSecurityConfig();
  if (!aMapPromise) {
    aMapPromise = load({
      key: getKey(),
      version: "2.0",
      plugins: ["AMap.Geolocation"],
    });
  }
  return aMapPromise;
}

/**
 * 通过 AMap.Geolocation 获取设备当前位置（国测局 GCJ-02）。
 * 需 HTTPS/localhost 且用户授权定位。
 */
export async function requestAmapGeolocation(): Promise<{
  lat: number;
  lng: number;
}> {
  const AMap = (await loadAmapWithGeolocation()) as AMapApi;
  if (!AMap) {
    throw new Error("高德 API 未就绪");
  }

  return new Promise((resolve, reject) => {
    const Geolocation = AMap.Geolocation;
    const geolocation = new Geolocation({
      enableHighAccuracy: true,
      timeout: 20000,
      needAddress: false,
      showButton: false,
    });

    geolocation.getCurrentPosition((status, result) => {
      if (status !== "complete" || !result) {
        const r = result;
        reject(new Error(r?.message || r?.info || r?.originMessage || `定位未成功（${status}）`));
        return;
      }

      const p = result.position;
      if (!p) {
        reject(new Error("高德未返回坐标，请检查 Key、安全密钥、域名白名单及浏览器定位权限。"));
        return;
      }

      const lat =
        "getLat" in p && typeof p.getLat === "function" ? p.getLat() : (p as { lat: number }).lat;
      const lng =
        "getLng" in p && typeof p.getLng === "function" ? p.getLng() : (p as { lng: number }).lng;

      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        Number.isNaN(lat) ||
        Number.isNaN(lng)
      ) {
        reject(new Error("坐标数据无效"));
        return;
      }

      resolve({ lat, lng });
    });
  });
}
