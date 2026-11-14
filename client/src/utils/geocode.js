// Reverse geocoding utility using OpenStreetMap Nominatim with BigDataCloud fallback.
// 100% free, no API key required.

export async function reverseGeocode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // 1. Try Nominatim (OpenStreetMap) with a 3.5s timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`,
      {
        headers: {
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const area =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.subdistrict ||
          addr.quarter ||
          addr.commercial ||
          addr.road ||
          '';
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.city_district ||
          addr.county ||
          '';
        const state = addr.state || addr.state_district || '';
        const country = addr.country || '';
        const pincode = addr.postcode || '';

        const parts = [area, city, state, pincode ? `(${pincode})` : '', country].filter(Boolean);
        const formatted = data.display_name || parts.join(', ');

        return {
          area,
          city,
          state,
          country,
          pincode,
          formatted,
          lat,
          lng,
        };
      }
    }
  } catch (err) {
    // console.warn('Nominatim reverse geocode lookup error:', err);
  }

  // 2. Fallback to BigDataCloud client API with a 3.5s timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const area = data.locality || '';
      const city = data.city || data.locality || '';
      const state = data.principalSubdivision || '';
      const country = data.countryName || '';
      const pincode = data.postcode || '';

      const parts = [area, city, state, country].filter(Boolean);
      const formatted = parts.join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      return {
        area,
        city,
        state,
        country,
        pincode,
        formatted,
        lat,
        lng,
      };
    }
  } catch (err) {
    // console.warn('BigDataCloud reverse geocode lookup error:', err);
  }

  // 3. Fallback when network is offline or no geocode found
  return {
    area: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    formatted: `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    lat,
    lng,
  };
}
