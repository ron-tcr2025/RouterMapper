
let map = L.map('map').setView([46.87, -113.99], 16);
let visitedPoints = JSON.parse(localStorage.getItem('visitedPoints') || '{}');
let driverMarker = null;
let gpsWatchID = null;
let autoCenter = true;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function haversine(lat1, lon1, lat2, lon2) {
    function toRad(x) {
        return x * Math.PI / 180;
    }
    const R = 6371e3;
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1), Δλ = toRad(lon2 - lon1);
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

fetch('missoula_v1.geojson')
    .then(res => res.json())
    .then(geojson => {
        const geoLayer = L.geoJSON(geojson, {
            pointToLayer: (feature, latlng) => {
                const key = latlng.lat.toFixed(6) + ',' + latlng.lng.toFixed(6);
                const visited = visitedPoints[key];
                return L.circleMarker(latlng, {
                    radius: 4,
                    color: visited ? 'green' : 'red',
                    fillColor: visited ? 'green' : 'red',
                    fillOpacity: 0.9,
                    weight: 0.5,
                    interactive: false
                });
            },
            onEachFeature: (feature, layer) => {
                if (feature.properties.segment_id) {
                    layer.bindTooltip(feature.properties.segment_id, {
                        permanent: true,
                        direction: 'center',
                        className: 'street-label'
                    });
                }
            }
        });
        geoLayer.addTo(map);
        map.fitBounds(geoLayer.getBounds());
        startTracking(geoLayer);
    });

function updateDriver(position, geoLayer) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const speed = position.coords.speed || 0;

    if (!driverMarker) {
        driverMarker = L.marker([lat, lng]).addTo(map);
    } else {
        driverMarker.setLatLng([lat, lng]);
    }

    if (autoCenter) {
        map.panTo([lat, lng], { animate: true });
    }

    adjustZoomBySpeed(speed);

    geoLayer.eachLayer(layer => {
        if (!layer.getLatLng) return;
        const pt = layer.getLatLng();
        const key = pt.lat.toFixed(6) + ',' + pt.lng.toFixed(6);
        if (!visitedPoints[key] && haversine(lat, lng, pt.lat, pt.lng) < 4.57) {
            visitedPoints[key] = true;
            layer.setStyle({ color: 'green', fillColor: 'green' });
            localStorage.setItem('visitedPoints', JSON.stringify(visitedPoints));
        }
    });
}

function startTracking(geoLayer) {
    gpsWatchID = navigator.geolocation.watchPosition(
        pos => updateDriver(pos, geoLayer),
        err => console.error('GPS error:', err),
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
}

function adjustZoomBySpeed(speed) {
    if (speed < 5) {
        map.setZoom(17);
    } else if (speed < 25) {
        map.setZoom(16);
    } else {
        map.setZoom(15);
    }
}

// Auto-center toggle control
const toggleBtn = L.control({ position: 'topright' });
toggleBtn.onAdd = () => {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    div.innerHTML = '<a href="#" title="Toggle Auto-Center" style="background:#fff;padding:6px;">🧭</a>';
    div.onclick = () => {
        autoCenter = !autoCenter;
        alert('Auto-centering is now ' + (autoCenter ? 'ON' : 'OFF'));
    };
    return div;
};
toggleBtn.addTo(map);
