import { load } from "@amap/amap-jsapi-loader";

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

type AMapGeocoder = new (o: Record<string, unknown>) => {
  getAddress: (
    lngLat: [number, number],
    cb: (status: string, result: { regeocode?: { formattedAddress?: string } }) => void,
  ) => void;
  getLocation: (
    address: string,
    cb: (
      status: string,
      result: {
        geocodes?: Array<{
          formattedAddress?: string;
          location?: { getLng?: () => number; getLat?: () => number };
        }>;
      },
    ) => void,
  ) => void;
};

type AMapAutocomplete = new (o: Record<string, unknown>) => {
  search: (
    keyword: string,
    cb: (
      status: string,
      result: {
        tips?: Array<{
          id?: string;
          name?: string;
          district?: string;
          address?: string;
          location?: { getLng?: () => number; getLat?: () => number };
        }>;
      },
    ) => void,
  ) => void;
};

type AMapApi = {
  Geocoder: AMapGeocoder;
  AutoComplete: AMapAutocomplete;
};

export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

let amapPromise: ReturnType<typeof load> | null = null;

function getKey(): string {
  const key = (import.meta.env.VITE_AMAP_KEY ?? "").trim();
  if (!key) throw new Error("未配置 VITE_AMAP_KEY");
  return key;
}

function setSecurityConfig(): void {
  const code = (import.meta.env.VITE_AMAP_SECURITY_JS_CODE ?? "").trim();
  if (code) window._AMapSecurityConfig = { securityJsCode: code };
}

async function loadAmapWithGeocoder() {
  setSecurityConfig();
  if (!amapPromise) {
    amapPromise = load({
      key: getKey(),
      version: "2.0",
      plugins: ["AMap.Geocoder", "AMap.AutoComplete"],
    });
  }
  return (await amapPromise) as AMapApi;
}

export async function reverseGeocodeDisplayAddress(lat: number, lng: number): Promise<string> {
  const AMap = await loadAmapWithGeocoder();
  const geocoder = new AMap.Geocoder({ radius: 1000 });

  return await new Promise((resolve, reject) => {
    geocoder.getAddress([lng, lat], (status, result) => {
      if (status !== "complete") {
        reject(new Error("逆地理编码失败"));
        return;
      }
      const addr = result?.regeocode?.formattedAddress;
      resolve(typeof addr === "string" ? addr : "");
    });
  });
}

export async function geocodeDisplayAddress(
  address: string,
): Promise<{ lat: number; lng: number; address: string }> {
  const keyword = address.trim();
  if (!keyword) throw new Error("请输入地点名称");

  const AMap = await loadAmapWithGeocoder();
  const geocoder = new AMap.Geocoder({});

  return await new Promise((resolve, reject) => {
    geocoder.getLocation(keyword, (status, result) => {
      if (status !== "complete") {
        reject(new Error("地点搜索失败"));
        return;
      }

      const first = result?.geocodes?.[0];
      if (!first) {
        reject(new Error("未找到匹配地点"));
        return;
      }

      const lng = first.location?.getLng?.();
      const lat = first.location?.getLat?.();
      if (typeof lat !== "number" || typeof lng !== "number") {
        reject(new Error("未找到匹配地点"));
        return;
      }

      resolve({
        lat,
        lng,
        address: first.formattedAddress || keyword,
      });
    });
  });
}

export async function searchAddressSuggestions(keyword: string): Promise<PlaceSuggestion[]> {
  const query = keyword.trim();
  if (!query) return [];

  const AMap = await loadAmapWithGeocoder();
  const autocomplete = new AMap.AutoComplete({});

  return await new Promise((resolve, reject) => {
    autocomplete.search(query, (status, result) => {
      if (status !== "complete") {
        reject(new Error("地点联想搜索失败"));
        return;
      }

      const tips = Array.isArray(result?.tips) ? result.tips : [];
      resolve(
        tips
          .map((tip, index) => {
            const name = typeof tip.name === "string" ? tip.name.trim() : "";
            const district = typeof tip.district === "string" ? tip.district.trim() : "";
            const addressText = typeof tip.address === "string" ? tip.address.trim() : "";
            const lng = tip.location?.getLng?.();
            const lat = tip.location?.getLat?.();

            return {
              id: tip.id || `${name}-${district}-${addressText}-${index}`,
              name,
              address: [district, addressText].filter(Boolean).join(" "),
              lat: typeof lat === "number" ? lat : undefined,
              lng: typeof lng === "number" ? lng : undefined,
            };
          })
          .filter((tip) => tip.name),
      );
    });
  });
}
