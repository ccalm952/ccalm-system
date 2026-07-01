import * as React from "react";
import { useNavigate } from "react-router-dom";

import { AmapMap } from "@/components/AmapMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { requestAmapGeolocation } from "@/lib/amap-geolocate";
import {
  geocodeDisplayAddress,
  reverseGeocodeDisplayAddress,
  searchAddressSuggestions,
  type PlaceSuggestion,
} from "@/lib/amap-regeo";
import type { GeofenceConfig } from "@/lib/attendance/types";
import { attendanceMutedTextClass } from "@/lib/attendance/attendance-theme";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DEFAULT_CENTER = { lat: 39.9042, lng: 116.4074 };
const DEFAULT_GEOFENCE: GeofenceConfig = {
  enabled: false,
  centerLat: DEFAULT_CENTER.lat,
  centerLng: DEFAULT_CENTER.lng,
  radiusM: 200,
  label: "门诊大楼",
};


export function CheckInRangePage() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const [ready, setReady] = React.useState(false);
  const [shouldAutoRefreshLocation, setShouldAutoRefreshLocation] = React.useState(false);
  const [radius, setRadius] = React.useState(DEFAULT_GEOFENCE.radiusM);
  const [placeName, setPlaceName] = React.useState(DEFAULT_GEOFENCE.label);
  const [center, setCenter] = React.useState({
    lat: DEFAULT_GEOFENCE.centerLat,
    lng: DEFAULT_GEOFENCE.centerLng,
  });
  const [geolocating, setGeolocating] = React.useState(false);
  const [savingGeofence, setSavingGeofence] = React.useState(false);
  const [placeInputFocused, setPlaceInputFocused] = React.useState(false);
  const [placeSuggestions, setPlaceSuggestions] = React.useState<PlaceSuggestion[]>([]);
  const [loadingPlaceSuggestions, setLoadingPlaceSuggestions] = React.useState(false);
  const regeoSeqRef = React.useRef(0);
  const suggestionSeqRef = React.useRef(0);
  const didAutoRefreshLocationRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!me) return;
        if (cancelled) return;
        if (me.role !== "admin") {
          navigate("/attendance", { replace: true });
          return;
        }

        const geofence = await api<GeofenceConfig>("GET", "/attendance/geofence");
        if (cancelled) return;
        setRadius(Math.max(1, Number(geofence.radiusM) || DEFAULT_GEOFENCE.radiusM));
        setPlaceName(geofence.label || DEFAULT_GEOFENCE.label);
        setCenter({
          lat: Number(geofence.centerLat) || DEFAULT_GEOFENCE.centerLat,
          lng: Number(geofence.centerLng) || DEFAULT_GEOFENCE.centerLng,
        });
        setShouldAutoRefreshLocation(!geofence.enabled);
        setReady(true);
      } catch {
        // 401 由 api.ts 全局处理
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, me]);

  const updateCenterWithAddress = React.useCallback(
    async (nextCenter: { lat: number; lng: number }) => {
      const seq = ++regeoSeqRef.current;
      setCenter(nextCenter);
      try {
        const address = await reverseGeocodeDisplayAddress(nextCenter.lat, nextCenter.lng);
        if (seq !== regeoSeqRef.current || !address) return;
        setPlaceName(address);
      } catch (e) {
        if (seq !== regeoSeqRef.current) return;
        toast.error(errorMessage(e));
      }
    },
    [],
  );

  const refreshLocation = React.useCallback(async () => {
    setGeolocating(true);
    try {
      const { lat, lng } = await requestAmapGeolocation();
      await updateCenterWithAddress({ lat, lng });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setGeolocating(false);
    }
  }, [updateCenterWithAddress]);

  React.useEffect(() => {
    const keyword = placeName.trim();
    const seq = ++suggestionSeqRef.current;
    if (!placeInputFocused || !keyword) {
      setPlaceSuggestions([]);
      setLoadingPlaceSuggestions(false);
      return;
    }

    setLoadingPlaceSuggestions(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const suggestions = await searchAddressSuggestions(keyword);
          if (seq !== suggestionSeqRef.current) return;
          setPlaceSuggestions(suggestions);
        } catch {
          if (seq !== suggestionSeqRef.current) return;
          setPlaceSuggestions([]);
        } finally {
          if (seq === suggestionSeqRef.current) setLoadingPlaceSuggestions(false);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [placeInputFocused, placeName]);

  const selectPlaceSuggestion = React.useCallback(
    async (suggestion: PlaceSuggestion) => {
      suggestionSeqRef.current += 1;
      setPlaceInputFocused(false);
      setPlaceSuggestions([]);

      const displayName = [suggestion.address, suggestion.name].filter(Boolean).join(" ");
      setPlaceName(displayName);
      try {
        if (typeof suggestion.lat === "number" && typeof suggestion.lng === "number") {
          await updateCenterWithAddress({ lat: suggestion.lat, lng: suggestion.lng });
          return;
        }

        const result = await geocodeDisplayAddress(displayName);
        setPlaceName(result.address);
        await updateCenterWithAddress({ lat: result.lat, lng: result.lng });
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    [updateCenterWithAddress],
  );

  React.useEffect(() => {
    if (!ready) return;
    if (!shouldAutoRefreshLocation) return;
    if (didAutoRefreshLocationRef.current) return;
    didAutoRefreshLocationRef.current = true;
    void refreshLocation();
  }, [ready, refreshLocation, shouldAutoRefreshLocation]);

  const saveCurrentGeofence = React.useCallback(async () => {
    const nextRadius = Math.max(1, Math.round(Number(radius) || DEFAULT_GEOFENCE.radiusM));
    const label = placeName.trim();
    if (!label) {
      toast.error("地点名称不能为空");
      return;
    }
    if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
      toast.error("中心点坐标不合法");
      return;
    }

    setSavingGeofence(true);
    try {
      await api("PUT", "/attendance/geofence", {
        enabled: true,
        centerLat: center.lat,
        centerLng: center.lng,
        radiusM: nextRadius,
        label,
      });
      setRadius(nextRadius);
      setPlaceName(label);
      toast.success("已保存全站打卡范围");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSavingGeofence(false);
    }
  }, [center.lat, center.lng, placeName, radius]);

  const clearRemoteGeofence = React.useCallback(async () => {
    regeoSeqRef.current += 1;
    suggestionSeqRef.current += 1;
    setRadius(DEFAULT_GEOFENCE.radiusM);
    setPlaceName(DEFAULT_GEOFENCE.label);
    setCenter(DEFAULT_CENTER);
    setPlaceSuggestions([]);
    setPlaceInputFocused(false);

    setSavingGeofence(true);
    try {
      await api("PUT", "/attendance/geofence", DEFAULT_GEOFENCE);
      toast.success("已清除全站打卡范围");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSavingGeofence(false);
    }
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background p-4">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="radius">
                半径（米）
              </label>
              <Input
                id="radius"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={Number.isNaN(radius) ? "" : radius}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRadius(Number.isNaN(v) ? 0 : v);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="place">
                地点名称
              </label>
              <div className="relative">
                <Input
                  id="place"
                  type="text"
                  value={placeName}
                  onFocus={() => setPlaceInputFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setPlaceInputFocused(false), 100);
                  }}
                  onChange={(e) => {
                    setPlaceName(e.target.value);
                  }}
                />
                {placeInputFocused && placeName.trim() ? (
                  <div className="absolute top-full z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    {loadingPlaceSuggestions ? (
                      <div className={cn("flex items-center gap-2 px-3 py-2 text-sm", attendanceMutedTextClass)}>
                        <Spinner data-icon="inline-start" />
                        搜索中…
                      </div>
                    ) : placeSuggestions.length ? (
                      placeSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="flex w-full flex-col rounded-sm px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => void selectPlaceSuggestion(suggestion)}
                        >
                          <span>{suggestion.name}</span>
                          {suggestion.address ? (
                            <span className={cn("text-xs", attendanceMutedTextClass)}>
                              {suggestion.address}
                            </span>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <div className={cn("px-3 py-2 text-sm", attendanceMutedTextClass)}>未找到匹配地点</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <p className={cn("text-sm", attendanceMutedTextClass)}>
            中心：{center.lat.toFixed(5)}, {center.lng.toFixed(5)}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" disabled={geolocating} onClick={refreshLocation}>
              {geolocating ? (
                <>
                  <Spinner data-icon="inline-start" />
                  定位中…
                </>
              ) : (
                "刷新定位"
              )}
            </Button>
            <Button type="button" disabled={savingGeofence} onClick={saveCurrentGeofence}>
              {savingGeofence ? (
                <>
                  <Spinner data-icon="inline-start" />
                  保存中…
                </>
              ) : (
                "保存配置"
              )}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={savingGeofence}
              onClick={clearRemoteGeofence}
            >
              清除全站配置
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <AmapMap
              height={360}
              className="bg-muted/30"
              zoom={15}
              center={[center.lng, center.lat]}
              radiusMeters={radius}
              markerDraggable
              onPickCenter={(nextCenter) => {
                void updateCenterWithAddress(nextCenter);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
