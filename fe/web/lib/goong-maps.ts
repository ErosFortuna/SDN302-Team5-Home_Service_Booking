/**
 * Goong Maps API Services (goong.io)
 * Optimized specifically for Vietnam addresses with zero credit card required.
 */

export interface GoongAddressSuggestion {
  label: string;
  secondary?: string;
  placeId: string;
  coords: [number, number]; // [lng, lat]
  source: 'goong' | 'api';
}

export function getGoongApiKey(): string {
  return process.env.NEXT_PUBLIC_GOONG_API_KEY || '';
}

export function getGoongMapKey(): string {
  return process.env.NEXT_PUBLIC_GOONG_MAP_KEY || '';
}

let goongSdkPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads Goong JS Map SDK and stylesheet via CDN
 */
export function loadGoongJsSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).goongjs) return Promise.resolve(true);

  if (goongSdkPromise) return goongSdkPromise;

  goongSdkPromise = new Promise<boolean>((resolve) => {
    // 1. Inject CSS
    const cssId = 'goong-js-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css';
      document.head.appendChild(link);
    }

    // 2. Inject Script
    const scriptId = 'goong-js-script';
    if (document.getElementById(scriptId)) {
      if ((window as any).goongjs) {
        resolve(true);
      } else {
        const existing = document.getElementById(scriptId);
        existing?.addEventListener('load', () => resolve(true));
        existing?.addEventListener('error', () => resolve(false));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Goong JS SDK from CDN.');
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return goongSdkPromise;
}

/**
 * Calls Goong Place AutoComplete API (or live geocoding API fallback)
 */
export async function searchGoongPlaces(query: string): Promise<GoongAddressSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const apiKey = getGoongApiKey();

  if (apiKey) {
    try {
      const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${encodeURIComponent(
        apiKey
      )}&input=${encodeURIComponent(q)}&limit=6`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.predictions)) {
          return data.predictions.map((p: any) => ({
            label: p.description,
            secondary: p.structured_formatting?.secondary_text || p.compound?.district || 'Goong Maps',
            placeId: p.place_id,
            coords: [106.6983, 10.7769], // Resolved on selection
            source: 'goong' as const,
          }));
        }
      }
    } catch (err) {
      console.warn('Goong AutoComplete error:', err);
    }
  }

  // Fallback to live geocoding API over HTTP if Goong API key not yet entered
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q + ', Việt Nam'
      )}&limit=6&addressdetails=1`
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          label: item.display_name,
          secondary: item.type ? `${item.type} - Việt Nam` : 'Địa điểm',
          placeId: `osm_${item.place_id}`,
          coords: [parseFloat(item.lon), parseFloat(item.lat)] as [number, number],
          source: 'api' as const,
        }));
      }
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Retrieves exact geometry coordinates and formatted address via Goong Place Detail API
 */
export async function fetchGoongPlaceDetail(
  placeId: string
): Promise<{ address: string; coords: [number, number] } | null> {
  const apiKey = getGoongApiKey();
  if (!apiKey || !placeId || placeId.startsWith('osm_')) return null;

  try {
    const url = `https://rsapi.goong.io/Place/Detail?place_id=${encodeURIComponent(
      placeId
    )}&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'OK' && data.result?.geometry?.location) {
        return {
          address: data.result.formatted_address || '',
          coords: [data.result.geometry.location.lng, data.result.geometry.location.lat],
        };
      }
    }
  } catch (err) {
    console.warn('Goong Place Detail error:', err);
  }

  return null;
}

/**
 * Reverse geocodes coordinates to address text using Goong Geocode API
 */
export async function reverseGeocodeGoong(
  coords: [number, number]
): Promise<string | null> {
  const apiKey = getGoongApiKey();
  if (!apiKey) return null;

  try {
    const [lng, lat] = coords;
    const url = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${encodeURIComponent(
      apiKey
    )}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
        return data.results[0].formatted_address;
      }
    }
  } catch {
    // ignore
  }

  return null;
}
