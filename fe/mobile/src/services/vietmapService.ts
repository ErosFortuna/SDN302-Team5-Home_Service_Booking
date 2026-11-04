/**
 * VietMap API Service for Mobile (maps.vietmap.vn)
 * Features: Vietmap Autocomplete v4 & Place Detail v4
 */

export interface MobileAddressSuggestion {
  label: string;
  secondary?: string;
  refId: string;
  coords: [number, number]; // [lng, lat]
  source: 'vietmap' | 'api';
}

const VIETMAP_API_KEY = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';

/**
 * Searches addresses via Vietmap Autocomplete API v4 or live geocoding fallback
 */
export async function searchAddressViaApi(query: string): Promise<MobileAddressSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  // 1. If VietMap API Key is configured, query VietMap v4 Autocomplete
  if (VIETMAP_API_KEY) {
    try {
      const url = `https://maps.vietmap.vn/api/autocomplete/v4?apikey=${encodeURIComponent(
        VIETMAP_API_KEY
      )}&text=${encodeURIComponent(q)}&display_type=5`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        if (Array.isArray(list) && list.length > 0) {
          return list.map((item: any) => ({
            label: item.display || item.address || item.name,
            secondary: item.address !== item.display ? item.address : (item.name || 'VietMap'),
            refId: item.ref_id,
            coords: [106.6983, 10.7769],
            source: 'vietmap' as const,
          }));
        }
      }
    } catch (err) {
      console.warn('VietMap Autocomplete error:', err);
    }
  }

  // 2. Fallback to real-time live geocoding API over HTTP
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q + ', Việt Nam'
      )}&limit=5&addressdetails=1`
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
  } catch (err) {
    console.warn('Live geocoding error:', err);
  }

  return [];
}

/**
 * Retrieves exact geometry coordinates via Vietmap Place Detail API v4
 */
export async function fetchVietmapPlaceDetail(
  refId: string
): Promise<{ address: string; coords: [number, number] } | null> {
  if (!VIETMAP_API_KEY || !refId || refId.startsWith('osm_')) return null;

  try {
    const url = `https://maps.vietmap.vn/api/place/v4?apikey=${encodeURIComponent(
      VIETMAP_API_KEY
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
    console.warn('VietMap Place Detail error:', err);
  }

  return null;
}
