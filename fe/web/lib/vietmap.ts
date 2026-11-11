/**
 * VietMap API Integration (maps.vietmap.vn)
 * Features:
 * - Vietmap Autocomplete API v4
 * - Vietmap Place Detail API v4
 * - Vietmap Reverse Geocoding API v4
 * - Vietmap GL JS Vector Maps SDK loader
 */

export interface VietmapAddressSuggestion {
  label: string;
  secondary?: string;
  refId: string;
  coords: [number, number]; // [lng, lat]
  source: 'vietmap' | 'api';
}

export function getVietmapApiKey(): string {
  return process.env.NEXT_PUBLIC_VIETMAP_API_KEY || '';
}

export function getVietmapTileKey(): string {
  return process.env.NEXT_PUBLIC_VIETMAP_TILE_KEY || process.env.NEXT_PUBLIC_VIETMAP_API_KEY || '';
}

let vietmapSdkPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads Vietmap GL JS SDK and stylesheet from CDN
 */
export function loadVietmapGlSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).vietmapgl) return Promise.resolve(true);

  if (vietmapSdkPromise) return vietmapSdkPromise;

  vietmapSdkPromise = new Promise<boolean>((resolve) => {
    // 1. Inject CSS
    const cssId = 'vietmap-gl-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/@vietmap/vietmap-gl-js@6.0.1/dist/vietmap-gl.css';
      document.head.appendChild(link);
    }

    // 2. Inject Script
    const scriptId = 'vietmap-gl-script';
    if (document.getElementById(scriptId)) {
      if ((window as any).vietmapgl) {
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
    script.src = 'https://unpkg.com/@vietmap/vietmap-gl-js@6.0.1/dist/vietmap-gl.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load VietMap GL JS SDK from CDN.');
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return vietmapSdkPromise;
}

/**
 * Searches location suggestions via Vietmap Autocomplete API v4
 */
export async function searchVietmapPlaces(query: string): Promise<VietmapAddressSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  // Deduplicate repeated comma-separated segments (e.g. "...Đà Nẵng, Thành Phố Đà Nẵng")
  const rawParts = q.split(',').map((s) => s.trim()).filter(Boolean);
  const dedupedQ = Array.from(new Set(rawParts)).join(', ');

  const apiKey = getVietmapApiKey();

  // 1. If VietMap API Key configured, query VietMap v4 Autocomplete
  if (apiKey) {
    const fetchV4 = async (text: string) => {
      try {
        const url = `https://maps.vietmap.vn/api/autocomplete/v4?apikey=${encodeURIComponent(
          apiKey
        )}&text=${encodeURIComponent(text)}&display_type=5`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.data || []);
          if (Array.isArray(list) && list.length > 0) {
            return list.map((item: any) => ({
              label: item.display || item.address || item.name,
              secondary: item.address !== item.display ? item.address : (item.name || 'VietMap'),
              refId: item.ref_id,
              coords: [108.2208, 16.0544] as [number, number], // Resolved via Place v4 on selection
              source: 'vietmap' as const,
            }));
          }
        }
      } catch (err) {
        console.warn('VietMap Autocomplete API error:', err);
      }
      return [];
    };

    let results = await fetchV4(dedupedQ);
    if (results.length === 0 && rawParts.length > 1) {
      // Fallback: search by first part (specific street/house/quarter)
      results = await fetchV4(rawParts[0]);
    }
    if (results.length > 0) {
      return results;
    }
  }

  // 2. Real-time Live Geocoding API fallback over HTTP
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
          refId: `osm_${item.place_id}`,
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
 * Retrieves exact coordinates and formatted address via Vietmap Place API v4
 */
export async function fetchVietmapPlaceDetail(
  refId: string
): Promise<{ address: string; coords: [number, number] } | null> {
  const apiKey = getVietmapApiKey();
  if (!apiKey || !refId || refId.startsWith('osm_')) return null;

  try {
    const url = `https://maps.vietmap.vn/api/place/v4?apikey=${encodeURIComponent(
      apiKey
    )}&refid=${encodeURIComponent(refId)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const place = data.data || data;
      if (place && typeof place.lat === 'number' && typeof place.lng === 'number') {
        return {
          address: place.display || place.address || '',
          coords: [place.lng, place.lat],
        };
      }
    }
  } catch (err) {
    console.warn('VietMap Place Detail API error:', err);
  }

  return null;
}


/**
 * Reverse geocodes coordinates to address text using Vietmap Reverse Geocoding API v4
 */
export async function reverseGeocodeVietmap(
  coords: [number, number]
): Promise<string | null> {
  const apiKey = getVietmapApiKey();
  if (!apiKey) return null;

  try {
    const [lng, lat] = coords;
    const url = `https://maps.vietmap.vn/api/reverse/v4?apikey=${encodeURIComponent(
      apiKey
    )}&lat=${lat}&lng=${lng}&display_type=6`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      if (Array.isArray(list) && list[0]?.display) {
        return list[0].display;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Geocodes an address string to coordinates [lng, lat]
 * First tries Vietmap Autocomplete + Place Detail API, then falls back to live OSM
 */
export async function geocodeAddress(
  query: string
): Promise<[number, number] | null> {
  const q = query.trim();
  if (!q) return null;

  try {
    const places = await searchVietmapPlaces(q);
    if (places && places.length > 0) {
      const top = places[0];
      if (top.refId && !top.refId.startsWith('osm_')) {
        const detail = await fetchVietmapPlaceDetail(top.refId);
        if (detail?.coords) return detail.coords;
      }
      if (
        top.coords &&
        !(top.coords[0] === 106.6983 && top.coords[1] === 10.7769)
      ) {
        return top.coords;
      }
    }
  } catch (err) {
    console.warn('geocodeAddress error:', err);
  }

  // Fallback to OSM directly
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q + ', Việt Nam'
      )}&limit=1`
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
      }
    }
  } catch {
    // ignore
  }

  return null;
}



/**
 * Gets user's current GPS location via browser Geolocation API
 * Returns [lng, lat]
 */
export function getCurrentBrowserCoordinates(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Trình duyệt không hỗ trợ định vị GPS.'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve([pos.coords.longitude, pos.coords.latitude]);
      },
      (err) => {
        let msg = 'Không thể lấy vị trí hiện tại.';
        if (err.code === 1) {
          msg = 'Vui lòng cho phép quyền truy cập vị trí trong trình duyệt.';
        } else if (err.code === 2) {
          msg = 'Tín hiệu GPS/Vị trí không khả dụng.';
        } else if (err.code === 3) {
          msg = 'Hết thời gian chờ phản hồi GPS.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

/**
 * Reverse geocodes coordinates to a human-readable address
 * Tries VietMap first, falls back to OSM Nominatim
 */
export async function reverseGeocodeCoords(
  coords: [number, number]
): Promise<string> {
  const vmAddress = await reverseGeocodeVietmap(coords);
  if (vmAddress) return vmAddress;

  try {
    const [lng, lat] = coords;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch {
    // ignore
  }

  return `Vị trí tọa độ (${coords[1].toFixed(5)}, ${coords[0].toFixed(5)})`;
}
