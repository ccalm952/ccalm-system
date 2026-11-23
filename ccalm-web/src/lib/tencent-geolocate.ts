import {
  getTencentMapKey,
  loadTencentGeolocation,
} from "@/lib/tencent-map-loader";

/**
 * 通过腾讯定位组件获取设备当前位置（国测局 GCJ-02）。
 * 需 HTTPS/localhost 且用户授权定位。
 */
export async function requestTencentGeolocation(): Promise<{
  lat: number;
  lng: number;
}> {
  const Geolocation = await loadTencentGeolocation();
  const key = getTencentMapKey();
  const geolocation = new Geolocation(key, "ccalm-web");

  return await new Promise((resolve, reject) => {
    geolocation.getLocation(
      (pos) => {
        const lat = pos?.lat;
        const lng = pos?.lng;
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
      },
      (err) => {
        reject(
          new Error(
            err?.message ||
              "定位未成功，请检查 Key、域名白名单及浏览器定位权限。",
          ),
        );
      },
      { timeout: 20000 },
    );
  });
}
