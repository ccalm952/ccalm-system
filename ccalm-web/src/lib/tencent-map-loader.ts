declare global {
  interface Window {
    TMap?: TMapNamespace;
    qq?: {
      maps?: {
        Geolocation?: new (
          key: string,
          referer: string,
        ) => {
          getLocation: (
            success: (pos: { lat: number; lng: number }) => void,
            error: (err: { message?: string; code?: number }) => void,
            options?: { timeout?: number },
          ) => void;
        };
      };
    };
  }
}

export type TMapLatLng = {
  getLat: () => number;
  getLng: () => number;
};

export type TMapNamespace = {
  LatLng: new (lat: number, lng: number) => TMapLatLng;
  Map: new (
    container: string | HTMLElement,
    opts: { center: TMapLatLng; zoom?: number; pitch?: number; rotation?: number },
  ) => {
    destroy: () => void;
    setCenter: (center: TMapLatLng) => void;
    setZoom: (zoom: number) => void;
    on: (event: string, cb: (e: { latLng?: TMapLatLng }) => void) => void;
    off?: (event: string, cb?: (...args: unknown[]) => void) => void;
  };
  MultiMarker: new (opts: Record<string, unknown>) => {
    setGeometries: (geometries: unknown[]) => void;
    setMap: (map: unknown) => void;
    on: (event: string, cb: (e: { geometry?: { position?: TMapLatLng } }) => void) => void;
    destroy?: () => void;
  };
  MultiCircle: new (opts: Record<string, unknown>) => {
    setGeometries: (geometries: unknown[]) => void;
    setMap: (map: unknown) => void;
    destroy?: () => void;
  };
  MarkerStyle: new (opts: Record<string, unknown>) => unknown;
  CircleStyle: new (opts: Record<string, unknown>) => unknown;
  service: {
    Geocoder: new () => {
      getAddress: (params: {
        location: TMapLatLng;
      }) => Promise<{
        status: number;
        message?: string;
        result?: {
          address?: string;
          formatted_addresses?: { recommend?: string; rough?: string };
          address_component?: Record<string, string>;
        };
      }>;
      getLocation: (params: {
        address: string;
      }) => Promise<{
        status: number;
        message?: string;
        result?: {
          title?: string;
          location?: TMapLatLng;
          address_components?: Record<string, string>;
        };
      }>;
    };
    Suggestion: new (opts?: { pageSize?: number }) => {
      getSuggestions: (params: {
        keyword: string;
      }) => Promise<{
        status: number;
        message?: string;
        data?: Array<{
          id?: string;
          title?: string;
          address?: string;
          location?: TMapLatLng;
        }>;
      }>;
    };
  };
};

let glPromise: Promise<TMapNamespace> | null = null;
let geoPromise: Promise<void> | null = null;

export function getTencentMapKey(): string {
  const key = (import.meta.env.VITE_TENCENT_MAP_KEY ?? "").trim();
  if (!key) {
    throw new Error(
      "未配置 VITE_TENCENT_MAP_KEY。请在 ccalm-web/.env 中设置腾讯位置服务 Key 后重启开发服务。",
    );
  }
  return key;
}

export function hasTencentMapKey(): boolean {
  return Boolean((import.meta.env.VITE_TENCENT_MAP_KEY ?? "").trim());
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`加载脚本失败：${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error(`加载脚本失败：${src}`));
    document.head.appendChild(script);
  });
}

/** 加载腾讯地图 JavaScript API GL（含 service 附加库）。 */
export function loadTencentMap(): Promise<TMapNamespace> {
  if (window.TMap?.service) {
    return Promise.resolve(window.TMap);
  }
  if (!glPromise) {
    const key = encodeURIComponent(getTencentMapKey());
    glPromise = loadScript(
      `https://map.qq.com/api/gljs?v=1.exp&key=${key}&libraries=service`,
    ).then(() => {
      if (!window.TMap?.service) {
        throw new Error("腾讯地图 API 未就绪");
      }
      return window.TMap;
    });
  }
  return glPromise;
}

type TencentGeolocationCtor = new (
  key: string,
  referer: string,
) => {
  getLocation: (
    success: (pos: { lat: number; lng: number }) => void,
    error: (err: { message?: string; code?: number }) => void,
    options?: { timeout?: number },
  ) => void;
};

/** 加载腾讯浏览器定位组件（返回 GCJ-02）。 */
export async function loadTencentGeolocation(): Promise<TencentGeolocationCtor> {
  getTencentMapKey();
  if (!geoPromise) {
    geoPromise = loadScript(
      "https://mapapi.qq.com/web/mapComponents/geoLocation/v/geolocation.min.js",
    );
  }
  await geoPromise;
  const Geolocation = window.qq?.maps?.Geolocation;
  if (!Geolocation) {
    throw new Error("腾讯定位组件未就绪");
  }
  return Geolocation;
}
