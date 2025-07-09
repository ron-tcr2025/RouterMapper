let map = L.map('map').fitWorld();
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

let userMarker = null;
let visited = new Set();

function onLocationFound(e) {
  const radius = e.accuracy / 2;
  if (!userMarker) {
    userMarker = L.marker(e.latlng).addTo(map);
  } else {
    userMarker.setLatLng(e.latlng);
  }
  map.setView(e.latlng, 17);

  // Lazy-load points near driver
  lazyLoadDots(e.latlng);
}

function lazyLoadDots(center) {
  fetch('missoula_v1.geojson')
    .then(response => response.json())
    .then(data => {
      const features = data.features;
      features.forEach(f => {
        const [lng, lat] = f.geometry.coordinates;
        const dist = map.distance(center, L.latLng(lat, lng));
        if (dist < 1000 && !visited.has(f.id)) {
          visited.add(f.id);
          L.circleMarker([lat, lng], {
            radius: 4,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.9,
          }).addTo(map);
        }
      });
    });
}

function onLocationError(e) {
  alert(e.message);
}

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

map.locate({ setView: true, watch: true, enableHighAccuracy: true });
