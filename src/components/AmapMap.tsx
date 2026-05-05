import * as React from "react";
import { load } from "@amap/amap-jsapi-loader";

type MapInstance = {
  destroy?: () => void;
  on?: (event: string, cb: (e: unknown) => void) => void;
  setCenter?: (center: [number, number]) => void;
  setZoom?: (zoom: number) => void;
  addControl?: (control: unknown) => void;
};

type MarkerInstance = {
  setPosition?: (pos: [number, number]) => void;
  setMap?: (map: unknown) => void;
  on?: (event: string, cb: (e: unknown) => void) => void;
};

type CircleInstance = {
  setCenter?: (center: [number, number]) => void;
  setRadius?: (radius: number) => void;
  setMap?: (map: unknown) => void;
};

type AMapNamespace = {
  Map: new (
    container: string | HTMLDivElement,
    opts: {
      viewMode?: "2D" | "3D";
      zoom?: number;
      center?: [number, number];
    },
  ) => MapInstance;
  Marker: new (opts: {
    position: [number, number];
    anchor?: string;
    draggable?: boolean;
  }) => MarkerInstance;
  Circle: new (opts: {
    center: [number, number];
    radius: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    fillColor?: string;
    fillOpacity?: number;
  }) => CircleInstance;
  Geolocation: new (opts: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    buttonPosition?: string;
    zoomToAccuracy?: boolean;
    showButton?: boolean;
  }) => unknown;
};

function getEnv(name: "VITE_AMAP_KEY" | "VITE_AMAP_SECURITY_JS_CODE"): string {
  const v = (import.meta.env[name] ?? "").trim();
  if (!v && name === "VITE_AMAP_KEY") {
    throw new Error(
      "未配置 VITE_AMAP_KEY。请在项目根目录 .env 中设置高德 Web 端（JS API）Key 后重启开发服务。",
    );
  }
  return v;
}

export function AmapMap(props: {
  height?: number;
  className?: string;
  zoom?: number;
  center?: [number, number];
  radiusMeters?: number;
  onPickCenter?: (center: { lat: number; lng: number }) => void;
  geolocationControl?: boolean;
  markerDraggable?: boolean;
}) {
  const {
    height = 420,
    className,
    zoom = 11,
    center = [116.397428, 39.90923],
    radiusMeters,
    onPickCenter,
    geolocationControl = false,
    markerDraggable = false,
  } = props;
  const id = React.useId();
  const onPickCenterRef = React.useRef<typeof onPickCenter>(onPickCenter);
  React.useEffect(() => {
    onPickCenterRef.current = onPickCenter;
  }, [onPickCenter]);

  /** 高德脚本异步加载完成时，父组件可能已把中心从默认值改成接口返回的坐标；创建地图必须用此时刻的最新值，不能写死北京。 */
  const centerRef = React.useRef(center);
  const zoomRef = React.useRef(zoom);
  React.useLayoutEffect(() => {
    centerRef.current = center;
    zoomRef.current = zoom;
  }, [center, zoom]);

  const apiRef = React.useRef<AMapNamespace | null>(null);
  const mapRef = React.useRef<MapInstance | null>(null);
  const markerRef = React.useRef<MarkerInstance | null>(null);
  const circleRef = React.useRef<CircleInstance | null>(null);

  React.useEffect(() => {
    const key = getEnv("VITE_AMAP_KEY");
    const securityJsCode = getEnv("VITE_AMAP_SECURITY_JS_CODE");
    if (securityJsCode) {
      (
        window as unknown as { _AMapSecurityConfig?: { securityJsCode: string } }
      )._AMapSecurityConfig = { securityJsCode };
    }

    let cancelled = false;

    load({
      key,
      version: "2.0",
      plugins: geolocationControl ? ["AMap.Geolocation"] : [],
    })
      .then((AMap) => {
        if (cancelled) return;
        const api = AMap as AMapNamespace;
        apiRef.current = api;
        const mapCenter = centerRef.current;
        const mapZoom = zoomRef.current;
        const map = new api.Map(id, {
          viewMode: "3D",
          zoom: mapZoom,
          center: mapCenter,
        });
        mapRef.current = map;

        if (geolocationControl) {
          const control = new api.Geolocation({
            enableHighAccuracy: true,
            timeout: 10000,
            buttonPosition: "RB",
            zoomToAccuracy: true,
            showButton: true,
          });
          map.addControl?.(control);
        }

        const marker = new api.Marker({
          position: mapCenter,
          anchor: "bottom-center",
          draggable: markerDraggable,
        });
        marker.setMap?.(map);
        markerRef.current = marker;

        if (markerDraggable && marker.on) {
          marker.on("dragend", (e) => {
            const payload = e as {
              lnglat?: { getLng?: () => number; getLat?: () => number };
            };
            const lng = payload.lnglat?.getLng?.();
            const lat = payload.lnglat?.getLat?.();
            if (typeof lat === "number" && typeof lng === "number") {
              onPickCenterRef.current?.({ lat, lng });
            }
          });
        }

        if (map.on) {
          map.on("click", (e) => {
            const payload = e as {
              lnglat?: { getLng?: () => number; getLat?: () => number };
            };
            const lng = payload.lnglat?.getLng?.();
            const lat = payload.lnglat?.getLat?.();
            if (typeof lat === "number" && typeof lng === "number") {
              onPickCenterRef.current?.({ lat, lng });
            }
          });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        // 让错误在控制台可见，页面可自行做 UI 提示
        console.error(e);
      });

    return () => {
      cancelled = true;
      markerRef.current?.setMap?.(null);
      circleRef.current?.setMap?.(null);
      mapRef.current?.destroy?.();
      apiRef.current = null;
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [geolocationControl, id, markerDraggable]);

  React.useEffect(() => {
    mapRef.current?.setCenter?.(center);
    markerRef.current?.setPosition?.(center);
    mapRef.current?.setZoom?.(zoom);

    if (typeof radiusMeters !== "number" || !Number.isFinite(radiusMeters)) {
      circleRef.current?.setMap?.(null);
      circleRef.current = null;
      return;
    }

    if (circleRef.current) {
      circleRef.current.setCenter?.(center);
      circleRef.current.setRadius?.(Math.max(1, radiusMeters));
      return;
    }

    const api = apiRef.current;
    const map = mapRef.current;
    if (!api || !map) return;
    const circle = new api.Circle({
      center,
      radius: Math.max(1, radiusMeters),
      strokeColor: "#1677ff",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: "#1677ff",
      fillOpacity: 0.15,
    });
    circle.setMap?.(map);
    circleRef.current = circle;
  }, [center, radiusMeters, zoom]);

  return <div id={id} className={className} style={{ height, width: "100%" }} />;
}
