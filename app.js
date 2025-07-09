
// Basic Leaflet map with user location and test marker for RouterMapper
const map = L.map('map').setView([46.8721, -113.9940], 14); // Missoula default view

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

let userMarker = null;

function onLocationFound(e) {
    const radius = e.accuracy;
    if (!userMarker) {
        userMarker = L.marker(e.latlng).addTo(map);
    } else {
        userMarker.setLatLng(e.latlng);
    }
    map.setView(e.latlng, 17); // Auto-center on GPS
}

function onLocationError(e) {
    alert(e.message);
}

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

map.locate({ setView: true, watch: true, maxZoom: 17 });
