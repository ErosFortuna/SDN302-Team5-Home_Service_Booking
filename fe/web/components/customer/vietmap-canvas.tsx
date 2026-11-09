"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Compass } from "lucide-react";
import {
  geocodeAddress,
  getVietmapApiKey,
  getVietmapTileKey,
  loadVietmapGlSdk,
  reverseGeocodeVietmap,
} from "@/lib/vietmap";

interface VietmapCanvasProps {
  coords: [number, number] | null; // [lng, lat]
  address: string;
  onLocationChange?: (coords: [number, number], address?: string) => void;
  height?: string;
  draggable?: boolean;
}

export function VietmapCanvas({
  coords,
  address,
  onLocationChange,
  height = "h-44",
  draggable = true,
}: VietmapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<[number, number]>(
    coords || [106.6983, 10.7769]
  );
  const apiKey = getVietmapApiKey();
  const tileKey = getVietmapTileKey();

  // Keep internal coordinates synced when coords prop changes
  useEffect(() => {
    if (coords) {
      setCurrentCoords(coords);
    }
  }, [coords]);

  // If coords is null but an address string is passed, resolve it automatically
  useEffect(() => {
    if (coords || !address || !address.trim() || address === "TP.HCM") return;
    let active = true;
    geocodeAddress(address).then((resolved) => {
      if (active && resolved) {
        setCurrentCoords(resolved);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({ center: resolved, zoom: 15 });
          if (markerInstanceRef.current) {
            markerInstanceRef.current.setLngLat(resolved);
          }
        }
      }
    });
    return () => {
      active = false;
    };
  }, [coords, address]);

  useEffect(() => {
    loadVietmapGlSdk().then((loaded) => {
      setIsSdkLoaded(loaded);
    });
  }, []);

  // Initialize or update VietMap GL JS Canvas
  useEffect(() => {
    if (!containerRef.current || !isSdkLoaded || !tileKey) return;
    const vietmapgl = (window as any).vietmapgl;
    if (!vietmapgl) return;

    const [lng, lat] = currentCoords;

    if (!mapInstanceRef.current) {
      const map = new vietmapgl.Map({
        container: containerRef.current,
        style: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${encodeURIComponent(tileKey)}`,
        center: [lng, lat],
        zoom: 15,
      });

      map.addControl(new vietmapgl.NavigationControl(), "top-right");

      const marker = new vietmapgl.Marker({
        draggable: draggable && !!onLocationChange,
        color: "#e11d48",
      })
        .setLngLat([lng, lat])
        .addTo(map);

      if (onLocationChange) {
        marker.on("dragend", async () => {
          const pos = marker.getLngLat();
          if (pos) {
            const newCoords: [number, number] = [pos.lng, pos.lat];
            setCurrentCoords(newCoords);
            const revAddr = await reverseGeocodeVietmap(newCoords);
            onLocationChange(newCoords, revAddr || undefined);
          }
        });

        map.on("click", async (e: any) => {
          if (e.lngLat) {
            marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
            const newCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
            setCurrentCoords(newCoords);
            const revAddr = await reverseGeocodeVietmap(newCoords);
            onLocationChange(newCoords, revAddr || undefined);
          }
        });
      }

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
    } else {
      mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 15 });
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLngLat([lng, lat]);
        markerInstanceRef.current.setDraggable(draggable && !!onLocationChange);
      }
    }
  }, [isSdkLoaded, tileKey, currentCoords, draggable, onLocationChange]);

  const [displayLng, displayLat] = currentCoords;

  return (
    <div className={`relative ${height} w-full overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-inner`}>
      {/* Real VietMap Vector Canvas */}
      <div ref={containerRef} className="h-full w-full" />

      {/* When VietMap API Key or Tile Key is pending */}
      {!tileKey && !apiKey && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 p-4 text-center backdrop-blur-xs">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-brand mb-2">
            <Compass className="size-5" />
          </div>
          <p className="text-xs font-bold text-foreground">VietMap API Integration</p>
          <p className="max-w-xs text-[11px] text-muted-foreground mt-1">
            Đăng ký API Key tại <a href="https://maps.vietmap.vn/" target="_blank" rel="noopener noreferrer nofollow" className="text-brand font-semibold hover:underline">maps.vietmap.vn</a> và điền <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-brand font-semibold">NEXT_PUBLIC_VIETMAP_API_KEY</code> & <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-brand font-semibold">NEXT_PUBLIC_VIETMAP_TILE_KEY</code> vào file <code className="font-mono">fe/web/.env.local</code>.
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
        <span>{displayLat.toFixed(4)}, {displayLng.toFixed(4)}</span>
      </div>
    </div>
  );
}
