
// app2.js - Optimized version for RouteMapper MVP with auto-centering and visibility fixes

let map;
let watchId;
let visited = new Set();
let autoCentering = true;
let currentMarker;
let geojsonLayer;

function initMap() {
    map = L.map('map').setView([46.87, -113.996], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    geojsonLayer = L.geoJSON(null, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#f00",
                color: "#800",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        }
    }).addTo(map);

    fetch('missoula_v1.geojson')
        .then(res => res.json())
        .then(data => {
            geojsonLayer.addData(data);
        });

    document.getElementById('start').onclick = startTracking;
    document.getElementById('pause').onclick = pauseTracking;
    document.getElementById('stop').onclick = stopTracking;
    document.getElementById('autocenter').onclick = toggleAutoCentering;
}

function startTracking() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    watchId = navigator.geolocation.watchPosition(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (currentMarker) {
            map.removeLayer(currentMarker);
        }

        const icon = L.divIcon({ className: 'direction-icon' });
        currentMarker = L.marker([lat, lng], { icon }).addTo(map);

        if (autoCentering) {
            map.setView([lat, lng], map.getZoom());
        }

        geojsonLayer.eachLayer(layer => {
            const distance = map.distance([lat, lng], layer.getLatLng());
            if (distance <= 15 && !visited.has(layer)) {
                visited.add(layer);
                layer.setStyle({ fillColor: "#0f0", color: "#080" });
            }
        });
    }, error => {
        console.error(error);
    }, {
        enableHighAccuracy: true,
        maximumAge: 1000
    });
}

function pauseTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

function stopTracking() {
    pauseTracking();
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    visited.clear();
    geojsonLayer.eachLayer(layer => {
        layer.setStyle({ fillColor: "#f00", color: "#800" });
    });
}

function toggleAutoCentering() {
    autoCentering = !autoCentering;
    document.getElementById('autocenter').textContent = 'Auto-Center: ' + (autoCentering ? 'ON' : 'OFF');
}

window.onload = initMap;
