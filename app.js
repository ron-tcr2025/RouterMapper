
let map = L.map('map');
let tracking = false;
let visitedPoints = [];
let gpsWatchID = null;
let driverMarker = null;
let autoCenter = true;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Attempt to center map on user's location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 16);
        driverMarker = L.marker([latitude, longitude]).addTo(map);
    }, () => {
        // fallback
        map.setView([46.87, -113.99], 13);
    });
} else {
    map.setView([46.87, -113.99], 13);
}

// Load GeoJSON and draw red points
fetch('missoula_v1.geojson')
    .then(res => res.json())
    .then(data => {
        let geoPoints = [];
        data.features.forEach(feature => {
            const coords = feature.geometry.coordinates;
            for (let i = 0; i < coords.length - 1; i++) {
                let lng1 = coords[i][0], lat1 = coords[i][1];
                let lng2 = coords[i + 1][0], lat2 = coords[i + 1][1];
                let steps = Math.floor(getDistance(lat1, lng1, lat2, lng2) / 7.62);

                for (let j = 0; j < steps; j++) {
                    let lat = lat1 + ((lat2 - lat1) * j / steps);
                    let lng = lng1 + ((lng2 - lng1) * j / steps);
                    let marker = L.circleMarker([lat, lng], {
                        radius: 4,
                        color: 'red',
                        fillColor: 'red',
                        fillOpacity: 1
                    }).addTo(map);
                    geoPoints.push({ lat, lng, marker, visited: false });
                }
            }
        });

        // Update points live as driver moves
        function updateDriverPosition(position) {
            const { latitude, longitude } = position.coords;

            if (autoCenter) map.setView([latitude, longitude]);

            if (driverMarker) {
                driverMarker.setLatLng([latitude, longitude]);
            } else {
                driverMarker = L.marker([latitude, longitude]).addTo(map);
            }

            geoPoints.forEach(p => {
                if (!p.visited && getDistance(latitude, longitude, p.lat, p.lng) < 4.6) {
                    p.marker.setStyle({ color: 'green', fillColor: 'green' });
                    p.visited = true;
                }
            });
        }

        window.startTracking = () => {
            if (navigator.geolocation && !gpsWatchID) {
                gpsWatchID = navigator.geolocation.watchPosition(updateDriverPosition);
                tracking = true;
            }
        };

        window.pauseTracking = () => {
            if (gpsWatchID) {
                navigator.geolocation.clearWatch(gpsWatchID);
                gpsWatchID = null;
                tracking = false;
            }
        };

        window.stopTracking = () => {
            window.pauseTracking();
            if (driverMarker) {
                map.removeLayer(driverMarker);
                driverMarker = null;
            }
        };
    });

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
