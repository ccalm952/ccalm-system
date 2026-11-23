import { loadTencentMap } from "@/lib/tencent-map-loader";

export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

export async function reverseGeocodeDisplayAddress(
  lat: number,
  lng: number,
): Promise<string> {
  const TMap = await loadTencentMap();
  const geocoder = new TMap.service.Geocoder();
  const result = await geocoder.getAddress({
    location: new TMap.LatLng(lat, lng),
  });
  if (result.status !== 0) {
    throw new Error(result.message || "逆地理编码失败");
  }
  const recommend = result.result?.formatted_addresses?.recommend;
  const address = result.result?.address;
  return (recommend || address || "").trim();
}

export async function geocodeDisplayAddress(
  address: string,
): Promise<{ lat: number; lng: number; address: string }> {
  const keyword = address.trim();
  if (!keyword) throw new Error("请输入地点名称");

  const TMap = await loadTencentMap();
  const geocoder = new TMap.service.Geocoder();
  const result = await geocoder.getLocation({ address: keyword });
  if (result.status !== 0) {
    throw new Error(result.message || "地点搜索失败");
  }

  const location = result.result?.location;
  const lat = location?.getLat?.();
  const lng = location?.getLng?.();
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("未找到匹配地点");
  }

  return {
    lat,
    lng,
    address: result.result?.title || keyword,
  };
}

export async function searchAddressSuggestions(
  keyword: string,
): Promise<PlaceSuggestion[]> {
  const query = keyword.trim();
  if (!query) return [];

  const TMap = await loadTencentMap();
  const suggestion = new TMap.service.Suggestion({ pageSize: 10 });
  const result = await suggestion.getSuggestions({ keyword: query });
  if (result.status !== 0) {
    throw new Error(result.message || "地点联想搜索失败");
  }

  const tips = Array.isArray(result.data) ? result.data : [];
  return tips
    .map((tip, index) => {
      const name = typeof tip.title === "string" ? tip.title.trim() : "";
      const address = typeof tip.address === "string" ? tip.address.trim() : "";
      const lat = tip.location?.getLat?.();
      const lng = tip.location?.getLng?.();
      return {
        id: tip.id || `${name}-${address}-${index}`,
        name,
        address,
        lat: typeof lat === "number" ? lat : undefined,
        lng: typeof lng === "number" ? lng : undefined,
      };
    })
    .filter((tip) => tip.name);
}
