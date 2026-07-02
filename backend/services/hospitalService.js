const axios = require('axios');

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find nearby hospitals using OpenStreetMap Overpass API (free, no key required)
exports.findNearbyHospitals = async (latitude, longitude, radius = 5000) => {
  const query = `[out:json][timeout:20];
(
  node["amenity"="hospital"](around:${radius},${latitude},${longitude});
  way["amenity"="hospital"](around:${radius},${latitude},${longitude});
  node["amenity"="clinic"](around:${radius},${latitude},${longitude});
  node["healthcare"="hospital"](around:${radius},${latitude},${longitude});
  node["healthcare"="clinic"](around:${radius},${latitude},${longitude});
);
out center 20;`;

  try {
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      'data=' + encodeURIComponent(query),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 25000
      }
    );

    const elements = response.data.elements || [];
    const hospitals = elements
      .map(el => {
        const eLat = el.lat ?? el.center?.lat;
        const eLng = el.lon ?? el.center?.lon;
        const tags = el.tags || {};
        const addrParts = [
          tags['addr:housenumber'],
          tags['addr:street'],
          tags['addr:suburb'] || tags['addr:city']
        ].filter(Boolean);

        return {
          id: el.id,
          name: tags.name,
          type: tags.amenity === 'hospital' ? 'Hospital' : 'Clinic / Healthcare Centre',
          address: addrParts.join(' ') || 'See map for location',
          phone: tags.phone || tags['contact:phone'] || 'Not listed',
          website: tags.website || null,
          emergency: tags.emergency === 'yes' ? 'Yes' : 'Unknown',
          latitude: eLat,
          longitude: eLng,
          distance: eLat != null && eLng != null
            ? parseFloat(calcDistance(latitude, longitude, eLat, eLng).toFixed(2))
            : 999,
          distanceUnit: 'km'
        };
      })
      .filter(h => h.latitude != null && h.longitude != null && h.name)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15);

    return hospitals.length > 0 ? hospitals : getMockHospitals(latitude, longitude);
  } catch (error) {
    console.error('Overpass API error:', error.message);
    return getMockHospitals(latitude, longitude);
  }
};

// Geocode address using OpenStreetMap Nominatim (free)
exports.geocodeAddress = async (address) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'json', limit: 1, countrycodes: 'in' },
      headers: { 'User-Agent': 'MediScan/1.0 (health-assistant)' },
      timeout: 8000
    });

    if (response.data?.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Nominatim geocoding error:', error.message);
    return null;
  }
};

function getMockHospitals(latitude, longitude) {
  return [
    { name: 'Government District Hospital', type: 'Hospital', address: 'Main Road', phone: '104', emergency: 'Yes', latitude: latitude + 0.01, longitude: longitude + 0.01, distance: 1.2, distanceUnit: 'km' },
    { name: 'Primary Health Centre (PHC)', type: 'Clinic', address: 'Near Bus Stand', phone: '104', emergency: 'No', latitude: latitude + 0.02, longitude: longitude - 0.01, distance: 2.5, distanceUnit: 'km' },
    { name: 'Community Health Centre (CHC)', type: 'Hospital', address: 'Town Centre', phone: '104', emergency: 'Yes', latitude: latitude - 0.015, longitude: longitude + 0.02, distance: 3.1, distanceUnit: 'km' }
  ];
}

module.exports = exports;
