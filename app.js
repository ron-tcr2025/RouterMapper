
let map = L.map('map').setView([46.87, -113.99], 15);
let tracking = false;
let visitedPoints = [];
let gpsWatchID;
let driverMarker = null;
let autoCenter = true;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function adjustZoomBySpeed(speed) {
    if (speed < 5) {
        map.setZoom(17);
    } else if (speed < 25) {
        map.setZoom(16);
    } else {
        map.setZoom(15);
    }
}

fetch('missoula_v1.geojson')
    .then(res => res.json())
    .then(data => {
        const geoJSONData = data;
        L.geoJSON(geoJSONData, {
            onEachFeature: (feature, layer) => {
                const coords = feature.geometry.coordinates;
                const name = feature.properties.segment_id || "Segment";

                layer.bindTooltip(name, {
                    permanent: true,
                    direction: 'center',
                    className: 'street-label'
                });

                for (let i = 0; i < coords.length - 1; i++) {
                    const [lng1, lat1] = coords[i];
                    const [lng2, lat2] = coords[i + 1];
                    const steps = Math.floor(dist(lat1, lng1, lat2, lng2) / 7.62);

                    for (let j = 0; j <= steps; j++) {
                        const lat = lat1 + (lat2 - lat1) * (j / steps);
                        const lng = lng1 + (lng2 - lng1) * (j / steps);
                        const point = L.circleMarker([lat, lng], {
                            radius: 5,
                            color: 'red',
                            fillColor: 'red',
                            fillOpacity: 0.8
                        }).addTo(map);
                        visitedPoints.push({ lat, lng, marker: point, visited: false });
                    }
                }
            }
        });
    });

function startTracking() {
    if (tracking) return;
    tracking = true;
    gpsWatchID = navigator.geolocation.watchPosition(updateDriver, console.error, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
    });
}

function stopTracking() {
    tracking = false;
    if (gpsWatchID != null) {
        navigator.geolocation.clearWatch(gpsWatchID);
        gpsWatchID = null;
    }
}

function updateDriver(position) {
    const { latitude, longitude, speed } = position.coords;
    if (driverMarker) {
        driverMarker.setLatLng([latitude, longitude]);
    } else {
        driverMarker = L.marker([latitude, longitude]).addTo(map);
    }

    if (autoCenter) {
        map.panTo([latitude, longitude], { animate: true });
    }

    if (speed != null) {
        adjustZoomBySpeed(speed);
    }

    visitedPoints.forEach(point => {
        if (!point.visited && getDistance(latitude, longitude, point.lat, point.lng) < 4.57) {
            point.visited = true;
            point.marker.setStyle({ color: 'green', fillColor: 'green' });
        }
    });
}

function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * Math.PI / 180;
}

function dist(lat1, lng1, lat2, lng2) {
    return getDistance(lat1, lng1, lat2, lng2);
}

// Toggle auto-centering
function toggleCentering() {
    autoCenter = !autoCenter;
    alert('Auto-centering is now ' + (autoCenter ? 'ON' : 'OFF'));
}

const toggleBtn = L.control({ position: 'topright' });
toggleBtn.onAdd = () => {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    div.innerHTML = '<a href="#" title="Toggle Auto-Center" style="background:#fff;padding:6px;">🧭</a>';
    div.onclick = toggleCentering;
    return div;
};
toggleBtn.addTo(map);
