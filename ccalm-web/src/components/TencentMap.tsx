import * as React from "react";

import {
  hasTencentMapKey,
  loadTencentMap,
  type TMapLatLng,
  type TMapNamespace,
} from "@/lib/tencent-map-loader";
import { cn } from "cn";

type MapInstance = InstanceType<TMapNamespace["Map"]>;
type MarkerLayer = InstanceType<TMapNamespace["MultiMarker"]>;
type CircleLayer = InstanceType<TMapNamespace["MultiCircle"]>;

const DEFAULT_CENTER: [number, number] = [116.397428, 39.90923];

export function TencentMap(props: {
  height?: number;
  className?: string;
  zoom?: number;
  /** [lng, lat] */
  center?: [number, number];
  radiusMeters?: number;
  onPickCenter?: (center: { lat: number; lng: number }) => void;
  markerDraggable?: boolean;
}) {
  const {
    height = 420,
    className,
    zoom = 11,
    center = DEFAULT_CENTER,
    radiusMeters,
    onPickCenter,
    markerDraggable = false,
  } = props;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const onPickCenterRef = React.useRef(onPickCenter);
  React.useEffect(() => {
    onPickCenterRef.current = onPickCenter;
  }, [onPickCenter]);

  const centerRef = React.useRef(center);
  const zoomRef = React.useRef(zoom);
  React.useLayoutEffect(() => {
    centerRef.current = center;
    zoomRef.current = zoom;
  }, [center, zoom]);

  const apiRef = React.useRef<TMapNamespace | null>(null);
  const mapRef = React.useRef<MapInstance | null>(null);
  const markerRef = React.useRef<MarkerLayer | null>(null);
  const circleRef = React.useRef<CircleLayer | null>(null);

  React.useEffect(() => {
    if (!hasTencentMapKey()) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    loadTencentMap()
      .then((TMap) => {
        if (cancelled || !containerRef.current) return;
        apiRef.current = TMap;
        const [lng, lat] = centerRef.current;
        const mapCenter = new TMap.LatLng(lat, lng);
        const map = new TMap.Map(containerRef.current, {
          center: mapCenter,
          zoom: zoomRef.current,
        });
        mapRef.current = map;

        const marker = new TMap.MultiMarker({
          map,
          styles: {
            marker: new TMap.MarkerStyle({
              width: 24,
              height: 35,
              anchor: { x: 12, y: 35 },
            }),
          },
          enableDragging: markerDraggable,
          geometries: [
            {
              id: "center",
              styleId: "marker",
              position: mapCenter,
            },
          ],
        });
        markerRef.current = marker;

        const emitPick = (pos: TMapLatLng | undefined) => {
          const nextLat = pos?.getLat?.();
          const nextLng = pos?.getLng?.();
          if (typeof nextLat === "number" && typeof nextLng === "number") {
            onPickCenterRef.current?.({ lat: nextLat, lng: nextLng });
          }
        };

        if (markerDraggable) {
          marker.on("dragend", (e) => {
            emitPick(e.geometry?.position);
          });
        }

        map.on("click", (e) => {
          emitPick(e.latLng);
        });
      })
      .catch((e) => {
        if (!cancelled) console.error(e);
      });

    return () => {
      cancelled = true;
      markerRef.current?.setMap?.(null);
      circleRef.current?.setMap?.(null);
      markerRef.current?.destroy?.();
      circleRef.current?.destroy?.();
      mapRef.current?.destroy?.();
      apiRef.current = null;
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [markerDraggable]);

  React.useEffect(() => {
    const TMap = apiRef.current;
    const map = mapRef.current;
    if (!TMap || !map) return;

    const [lng, lat] = center;
    const nextCenter = new TMap.LatLng(lat, lng);
    map.setCenter(nextCenter);
    map.setZoom(zoom);
    markerRef.current?.setGeometries([
      {
        id: "center",
        styleId: "marker",
        position: nextCenter,
      },
    ]);

    if (typeof radiusMeters !== "number" || !Number.isFinite(radiusMeters)) {
      circleRef.current?.setMap?.(null);
      circleRef.current = null;
      return;
    }

    const geometry = {
      id: "fence",
      styleId: "circle",
      center: nextCenter,
      radius: Math.max(1, radiusMeters),
    };

    if (circleRef.current) {
      circleRef.current.setGeometries([geometry]);
      return;
    }

    circleRef.current = new TMap.MultiCircle({
      map,
      styles: {
        circle: new TMap.CircleStyle({
          color: "rgba(22,119,255,0.15)",
          showBorder: true,
          borderColor: "rgba(22,119,255,0.9)",
          borderWidth: 2,
        }),
      },
      geometries: [geometry],
    });
  }, [center, radiusMeters, zoom]);

  if (!hasTencentMapKey()) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
        style={{ height, width: "100%" }}
      >
        未配置腾讯地图 Key（VITE_TENCENT_MAP_KEY），地图无法显示
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={{ height, width: "100%" }} />
  );
}
