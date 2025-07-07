
let map = L.map('map').setView([46.87, -113.99], 13);
let tracking = false;
let autoCentering = true;
let visitedPoints = [];
let gpsWatchID;
let driverMarker = null;
let lastHeading = 0;
let visitedLog = [];

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load and render GeoJSON
fetch('missoula_v1.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        const coords = feature.geometry.coordinates;
        const name = feature.properties.segment_id || "Segment";

        layer.bindTooltip(name, {
          permanent: true,
          direction: "center",
          className: "street-label"
        }).openTooltip();

        for (let i = 0; i < coords.length - 1; i++) {
          const [lng1, lat1] = coords[i];
          const [lng2, lat2] = coords[i + 1];
          const dist = getDistance(lat1, lng1, lat2, lng2);
          const steps = Math.floor(dist / 7.62);

          for (let s = 0; s <= steps; s++) {
            const lat = lat1 + (lat2 - lat1) * (s / steps);
            const lng = lng1 + (lng2 - lng1) * (s / steps);

            const marker = L.circleMarker([lat, lng], {
              radius: 4,
              color: 'red'
            }).addTo(map);

            visitedPoints.push({ lat, lng, marker, visited: false });
          }
        }
      }
    });
  })
  .catch(err => console.error("GeoJSON load failed:", err));

// Tracking
function startTracking() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }

  tracking = true;

  gpsWatchID = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude, heading } = pos.coords;
    const latlng = L.latLng(latitude, longitude);
    const rotation = heading || lastHeading;

    if (!driverMarker) {
      driverMarker = L.marker(latlng, {
        icon: L.divIcon({
          className: 'driver-icon',
          html: `<div id="car" style="transform: rotate(${rotation}deg); transition: transform 0.3s ease;">🚗</div>`,
          iconSize: [30, 30],
          className: 'transparent-icon'
        })
      }).addTo(map);
    } else {
      smoothMove(driverMarker.getLatLng(), latlng, 500, rotation);
    }

    if (heading) lastHeading = heading;
    if (autoCentering) map.setView(latlng);

    visitedPoints.forEach(p => {
      if (!p.visited && getDistance(latitude, longitude, p.lat, p.lng) < 10) {
        p.marker.setStyle({ color: 'green' });
        p.visited = true;

        visitedLog.push({
          lat: p.lat,
          lng: p.lng,
          timestamp: new Date().toISOString()
        });
      }
    });

  }, err => {
    console.error("Tracking error:", err);
  }, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 10000
  });
}

function stopTracking() {
  if (gpsWatchID) {
    navigator.geolocation.clearWatch(gpsWatchID);
    gpsWatchID = null;
  }
  tracking = false;
}

// Smooth transition
function smoothMove(from, to, duration, heading) {
  const steps = 10;
  const delay = duration / steps;
  let step = 0;

  const latDiff = (to.lat - from.lat) / steps;
  const lngDiff = (to.lng - from.lng) / steps;

  const interval = setInterval(() => {
    step++;
    const newLat = from.lat + latDiff * step;
    const newLng = from.lng + lngDiff * step;
    driverMarker.setLatLng([newLat, newLng]);

    const car = document.getElementById("car");
    if (car) car.style.transform = `rotate(${heading}deg)`;

    if (step >= steps) clearInterval(interval);
  }, delay);
}

// Distance calculation
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2)**2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Toggle centering
function toggleCentering() {
  autoCentering = !autoCentering;
  alert(`Auto-centering is now ${autoCentering ? 'ON' : 'OFF'}`);
}

// UI Toggle button
const toggleBtn = L.control({ position: 'topright' });
toggleBtn.onAdd = () => {
  const div = L.DomUtil.create('div', 'leaflet-bar');
  div.innerHTML = `<a href="#" title="Toggle Auto-Center" style="background:#fff; padding:4px;">🧭</a>`;
  div.onclick = toggleCentering;
  return div;
};
toggleBtn.addTo(map);
