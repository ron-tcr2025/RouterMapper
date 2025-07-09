
let map = L.map('map').setView([46.8721, -113.9940], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

let userMarker = null;
let initialCentered = false;
let loadedFeatures = new Set();

function onLocationFound(e) {
  const { lat, lng } = e.latlng;

  if (!userMarker) {
    userMarker = L.marker([lat, lng]).addTo(map);
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  if (!initialCentered) {
    map.setView([lat, lng], 17); // Center only ONCE
    initialCentered = true;
  }

  lazyLoadNearbyDots([lat, lng]);
}

function lazyLoadNearbyDots(center) {
  fetch('missoula_v1.geojson')
    .then(response => response.json())
    .then(data => {
      data.features.forEach((feature, idx) => {
        const coords = feature.geometry.coordinates;
        const id = feature.id || idx;

        if (loadedFeatures.has(id)) return;

        const [lng, lat] = coords;
        const dist = map.distance(center, [lat, lng]);

        if (dist <= 1200) {
          loadedFeatures.add(id);
          L.circleMarker([lat, lng], {
            radius: 5,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.85
          }).addTo(map);
        }
      });
    });
}

function onLocationError(e) {
  console.error("GPS error:", e.message);
}

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

map.locate({ watch: true, enableHighAccuracy: true });
