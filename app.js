
// Haversine formula to calculate distance between two coordinates
function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function interpolatePoints(coords, interval = 7.6) {
    const result = [];
    for (let i = 0; i < coords.length - 1; i++) {
        const [lng1, lat1] = coords[i];
        const [lng2, lat2] = coords[i + 1];
        const dist = haversine(lat1, lng1, lat2, lng2);
        const numPoints = Math.floor(dist / interval);
        for (let j = 0; j < numPoints; j++) {
            const lat = lat1 + (lat2 - lat1) * j / numPoints;
            const lng = lng1 + (lng2 - lng1) * j / numPoints;
            result.push([lat, lng]);
        }
    }
    return result;
}

let redDots = [];

function loadGeoJSON() {
    fetch('missoula_v1.geojson')
    .then(response => {
        if (!response.ok) throw new Error("Failed to load GeoJSON.");
        return response.json();
    })
    .then(data => {
        if (!data.features || data.features.length === 0) {
            console.error("GeoJSON file loaded but contains no features.");
            return;
        }

        console.log("Loaded GeoJSON features:", data.features.length);

        let dotCount = 0;
        data.features.forEach((feature, idx) => {
            if (feature.geometry.type === "LineString") {
                const coords = feature.geometry.coordinates;
                const dots = interpolatePoints(coords);
                dots.forEach(([lat, lng], dotIdx) => {
                    const marker = L.circleMarker([lat, lng], {
                        radius: 4,
                        color: 'red',
                        fillColor: 'red',
                        fillOpacity: 0.8
                    }).addTo(map);
                    redDots.push({ marker, lat, lng });
                    dotCount++;
                });
            }
        });

        console.log(`Total red dots added: ${dotCount}`);
        L.popup()
          .setLatLng(map.getCenter())
          .setContent(`✔ Loaded ${dotCount} red GPS dots.`)
          .openOn(map);
    })
    .catch(err => {
        console.error("GeoJSON loading failed:", err);
        alert("Failed to load GPS data.");
    });
}
