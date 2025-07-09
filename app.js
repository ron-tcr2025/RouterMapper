
let map = L.map('map').setView([46.8721, -113.9940], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

let userMarker = null;
let initialCentered = false;
let redDots = [];

function toRadians(deg) {
  return deg * Math.PI / 180;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolatePoints(coords, interval = 7.6) {
  const result = [];
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const dist = haversine(lat1, lng1, lat2, lng2);
    const numPoints = Math.floor(dist / interval);
    for (let j = 0; j <= numPoints; j++) {
      const lat = lat1 + (lat2 - lat1) * j / numPoints;
      const lng = lng1 + (lng2 - lng1) * j / numPoints;
      result.push([lat, lng]);
    }
  }
  return result;
}

function loadGeoJSON() {
  fetch('missoula_v1.geojson')
    .then(response => response.json())
    .then(data => {
      data.features.forEach((feature, idx) => {
        if (feature.geometry.type === "LineString") {
          const coords = feature.geometry.coordinates;
          const dots = interpolatePoints(coords);
          dots.forEach(([lat, lng], dotIdx) => {
            const marker = L.circleMarker([lat, lng], {
              radius: 4,
              color: 'red',
              fillColor: 'red',
              fillOpacity: 0.8
            }).addTo(map);
            redDots.push({ marker, lat, lng });
          });
        }
      });
    });
}

function onLocationFound(e) {
  const { lat, lng } = e.latlng;

  if (!userMarker) {
    userMarker = L.marker([lat, lng]).addTo(map);
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  if (!initialCentered) {
    map.setView([lat, lng], 17);
    initialCentered = true;
  }

  redDots.forEach(dot => {
    const dist = haversine(lat, lng, dot.lat, dot.lng);
    if (dist < 4.6 && dot.marker.options.fillColor === 'red') {
      dot.marker.setStyle({ fillColor: 'green', color: 'green' });
    }
  });
}

function onLocationError(e) {
  console.error("GPS error:", e.message);
}

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

map.locate({ watch: true, enableHighAccuracy: true });
loadGeoJSON();
