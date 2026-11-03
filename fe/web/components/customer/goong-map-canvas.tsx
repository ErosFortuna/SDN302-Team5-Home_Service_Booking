"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Compass } from "lucide-react";
import { getGoongMapKey, loadGoongJsSdk, reverseGeocodeGoong } from "@/lib/goong-maps";

interface GoongMapCanvasProps {
  coords: [number, number] | null; // [lng, lat]
  address: string;
  onLocationChange?: (coords: [number, number], address?: string) => void;
  height?: string;
}

export function GoongMapCanvas({
  coords,
  address,
  onLocationChange,
  height = "h-44",
}: GoongMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [isGoongJsLoaded, setIsGoongJsLoaded] = useState<boolean>(false);
  const mapKey = getGoongMapKey();

  const lng = coords ? coords[0] : 106.6983; // default Ho Chi Minh City
  const lat = coords ? coords[1] : 10.7769;

  useEffect(() => {
    loadGoongJsSdk().then((loaded) => {
      setIsGoongJsLoaded(loaded);
    });
  }, []);

  // Initialize or update Goong JS Map Canvas
  useEffect(() => {
    if (!containerRef.current || !isGoongJsLoaded || !mapKey) return;
    const goongjs = (window as any).goongjs;
    if (!goongjs) return;

    goongjs.accessToken = mapKey;

    if (!mapInstanceRef.current) {
      const map = new goongjs.Map({
        container: containerRef.current,
        style: "https://tiles.goong.io/assets/goong_map_web.json",
        center: [lng, lat],
        zoom: 15,
      });

      map.addControl(new goongjs.NavigationControl(), "top-right");

      const marker = new goongjs.Marker({
        draggable: !!onLocationChange,
        color: "#e11d48",
      })
        .setLngLat([lng, lat])
        .addTo(map);

      if (onLocationChange) {
        marker.on("dragend", async () => {
          const pos = marker.getLngLat();
          if (pos) {
            const newCoords: [number, number] = [pos.lng, pos.lat];
            const revAddr = await reverseGeocodeGoong(newCoords);
            onLocationChange(newCoords, revAddr || undefined);
          }
        });

        map.on("click", async (e: any) => {
          if (e.lngLat) {
            marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
            const newCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
            const revAddr = await reverseGeocodeGoong(newCoords);
            onLocationChange(newCoords, revAddr || undefined);
          }
        });
      }

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
    } else {
      mapInstanceRef.current.flyTo({ center: [lng, lat] });
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLngLat([lng, lat]);
      }
    }
  }, [isGoongJsLoaded, mapKey, lng, lat, onLocationChange]);

  return (
    <div className={`relative ${height} w-full overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-inner`}>
      {/* Real Goong Vector Map Canvas */}
      <div ref={containerRef} className="h-full w-full" />

      {/* When Goong Map Key is pending */}
      {!mapKey && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 p-4 text-center backdrop-blur-xs">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-brand mb-2">
            <Compass className="size-5" />
          </div>
          <p className="text-xs font-bold text-foreground">Goong Maps Integration</p>
          <p className="max-w-xs text-[11px] text-muted-foreground mt-1">
            Đăng ký miễn phí tại <a href="https://account.goong.io" target="_blank" rel="noreferrer" className="text-brand font-semibold hover:underline">account.goong.io</a> (không cần thẻ Visa) và dán <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-brand font-semibold">NEXT_PUBLIC_GOONG_MAP_KEY</code> vào <code className="font-mono">fe/web/.env.local</code>.
          </p>
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-muted/80 px-3 py-1.5 text-[11px] text-muted-foreground">
            <MapPin className="size-3.5 text-brand" />
            <span className="line-clamp-1 font-medium">{address || "TP. Hồ Chí Minh, Việt Nam"}</span>
          </div>
        </div>
      )}

      {/* Coordinates pill overlay */}
      <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-lg bg-background/90 px-2 py-1 text-[10px] font-bold text-muted-foreground shadow-xs backdrop-blur-xs border border-border">
        <Navigation className="size-3 text-brand" />
        <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
    </div>
  );
}
