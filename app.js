
let map;
let tracking = false;
let visitedPoints = [];
let driverMarker = null;
let autoCenter = true;

function initMap(lat, lng) {
    map = L.map('map').setView([lat, lng], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const toggleBtn = L.control({position: 'topright'});
    toggleBtn.onAdd = function() {
        let div = L.DomUtil.create('div', 'toggle-btn');
        div.innerHTML = '<button id="toggleAutoCenter">Auto-Center: ON</button>';
        div.firstChild.onclick = function() {
            autoCenter = !autoCenter;
            this.innerText = "Auto-Center: " + (autoCenter ? "ON" : "OFF");
        };
        return div;
    };
    toggleBtn.addTo(map);

    map.on('moveend', renderVisiblePoints);
    renderVisiblePoints();
}

function isPointInView(lat, lng) {
    return map.getBounds().contains([lat, lng]);
}

function addPoint(lat, lng, visited = false) {
    let color = visited ? 'green' : 'red';
    let circle = L.circleMarker([lat, lng], {
        radius: 10,
        color: color,
        fillColor: color,
        fillOpacity: 1.0,
        weight: 0
    }).addTo(map);
    return circle;
}

let segmentPoints = [];

fetch('missoula_v1.geojson')
.then(res => res.json())
.then(data => {
    let renderCount = 0;
    data.features.forEach((feature) => {
        const coords = feature.geometry.coordinates;
        for (let i = 0; i < coords.length - 1; i++) {
            const [lng1, lat1] = coords[i];
            const [lng2, lat2] = coords[i + 1];
            const steps = Math.floor(getDistance(lat1, lng1, lat2, lng2) / 7.62);
            for (let s = 0; s < steps; s++) {
                let lat = lat1 + ((lat2 - lat1) * s / steps);
                let lng = lng1 + ((lng2 - lng1) * s / steps);
                let point = { lat, lng, visited: false };
                segmentPoints.push(point);

                if (renderCount < 500) {
                    point.marker = addPoint(lat, lng);
                    renderCount++;
                }
            }
        }
    });
    console.log("Initial red dots rendered:", renderCount);
});

function renderVisiblePoints() {
    if (!map) return;
    segmentPoints.forEach(point => {
        if (!point.marker && isPointInView(point.lat, point.lng)) {
            point.marker = addPoint(point.lat, point.lng);
        }
    });
}

function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
    return deg * Math.PI / 180;
}

function updateDriverPosition(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    if (!driverMarker) {
        driverMarker = L.marker([lat, lng]).addTo(map);
        if (!map) initMap(lat, lng);
    } else {
        driverMarker.setLatLng([lat, lng]);
    }

    if (autoCenter && map) {
        map.setView([lat, lng], map.getZoom());
    }

    segmentPoints.forEach(point => {
        if (!point.visited && getDistance(lat, lng, point.lat, point.lng) <= 5) {
            point.visited = true;
            if (point.marker) point.marker.setStyle({ color: 'green', fillColor: 'green' });
        }
    });
}

function startTracking() {
    if (navigator.geolocation) {
        tracking = true;
        navigator.geolocation.watchPosition(updateDriverPosition, 
            err => alert("Geolocation error: " + err.message),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    } else {
        alert("Geolocation is not supported by this device.");
    }
}

document.getElementById('start').onclick = startTracking;
