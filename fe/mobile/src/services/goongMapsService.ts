/**
 * Goong Maps API Service for Mobile (goong.io)
 * Optimized for Vietnam addresses with zero credit card required.
 */

export interface MobileAddressSuggestion {
  label: string;
  secondary?: string;
  placeId: string;
  coords: [number, number]; // [lng, lat]
  source: 'goong' | 'api';
}

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY || '';

/**
 * Searches addresses via Goong Places AutoComplete API or live fallback
 */
export async function searchAddressViaApi(query: string): Promise<MobileAddressSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  // 1. If Goong API Key is configured, query Goong Places AutoComplete
  if (GOONG_API_KEY) {
    try {
      const url = `https://rsapi.goong.io/Place/AutoComplete?input=${encodeURIComponent(
        q
      )}&api_key=${encodeURIComponent(GOONG_API_KEY)}&limit=5`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.predictions)) {
          return data.predictions.map((p: any) => ({
            label: p.description,
            secondary: p.structured_formatting?.secondary_text || p.compound?.district || 'Goong Maps',
            placeId: p.place_id,
            coords: [106.6983, 10.7769],
            source: 'goong' as const,
          }));
        }
      }
    } catch (err) {
      console.warn('Goong Places API error:', err);
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
          placeId: `osm_${item.place_id}`,
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
 * Retrieves exact geometry coordinates via Goong Place Detail API
 */
export async function fetchGoongPlaceDetail(
  placeId: string
): Promise<{ address: string; coords: [number, number] } | null> {
  if (!GOONG_API_KEY || !placeId || placeId.startsWith('osm_')) return null;

  try {
    const url = `https://rsapi.goong.io/Place/Detail?place_id=${encodeURIComponent(
      placeId
    )}&api_key=${encodeURIComponent(GOONG_API_KEY)}`;
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
