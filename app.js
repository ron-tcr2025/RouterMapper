
let map = L.map('map').setView([46.87, -113.99], 13);
let tracking = false;
let visitedPoints = [];
let gpsWatchID;
let driverMarker = null;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

fetch('missoula_v1.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        let coords = feature.geometry.coordinates;
        let name = feature.properties.segment_id || "Segment";

        layer.bindTooltip(name, {
          permanent: true,
          direction: "center",
          className: "street-label"
        }).openTooltip();

        for (let i = 0; i < coords.length - 1; i++) {
          let [lng1, lat1] = coords[i];
          let [lng2, lat2] = coords[i + 1];
          let dist = getDistance(lat1, lng1, lat2, lng2);
          let steps = Math.floor(dist / 7.62);

          for (let s = 0; s <= steps; s++) {
            let lat = lat1 + (lat2 - lat1) * (s / steps);
            let lng = lng1 + (lng2 - lng1) * (s / steps);

            let marker = L.circleMarker([lat, lng], {
              radius: 4,
              color: 'red',
              pane: 'markerPane'
            }).addTo(map);

            visitedPoints.push({ lat, lng, marker, visited: false });
          }
        }
      }
    });
  });

function startTracking() {
  if (tracking) return;
  tracking = true;
  gpsWatchID = navigator.geolocation.watchPosition(updateDriver, err => {
    alert("Location error: " + err.message);
  }, {
    enableHighAccuracy: true
  });
}

function pauseTracking() {
  tracking = false;
  if (gpsWatchID) navigator.geolocation.clearWatch(gpsWatchID);
}

function stopTracking() {
  pauseTracking();
}

function updateDriver(pos) {
  let lat = pos.coords.latitude;
  let lng = pos.coords.longitude;

  if (!driverMarker) {
    driverMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'custom-driver-icon',
        html: '🚗',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
  } else {
    driverMarker.setLatLng([lat, lng]);
  }

  map.setView([lat, lng]);

  visitedPoints.forEach(p => {
    if (!p.visited && getDistance(lat, lng, p.lat, p.lng) < 10) {
      p.marker.setStyle({ color: 'green' });
      p.visited = true;
    }
  });
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = x => x * Math.PI / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
