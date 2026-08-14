function generateCircle(centerLat, centerLng, radiusKm, points = 32) {
    const polygon = [];

    const earthRadius = 6371;

    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * (2 * Math.PI);

        const lat =
            centerLat +
            (radiusKm / earthRadius) *
                (180 / Math.PI) *
                Math.cos(angle);

        const lng =
            centerLng +
            (radiusKm / earthRadius) *
                (180 / Math.PI) *
                Math.sin(angle) /
                Math.cos((centerLat * Math.PI) / 180);

        polygon.push([lat, lng]);
    }

    return polygon;
}

function generateRiskZones(lat, lng, probability) {

    let highRadius = 0.8;
    let mediumRadius = 2;
    let lowRadius = 4;

    if (probability >= 90) {
        highRadius = 2;
        mediumRadius = 5;
        lowRadius = 8;
    }

    else if (probability >= 70) {
        highRadius = 1.5;
        mediumRadius = 4;
        lowRadius = 6;
    }

    else if (probability >= 40) {
        highRadius = 1;
        mediumRadius = 3;
        lowRadius = 5;
    }

    return [
    {
        priority: "HIGH",
        latitude: lat,
        longitude: lng,
        radius: highRadius * 1000
    },
    {
        priority: "MEDIUM",
        latitude: lat,
        longitude: lng,
        radius: mediumRadius * 1000
    },
    {
        priority: "LOW",
        latitude: lat,
        longitude: lng,
        radius: lowRadius * 1000
    }
];
}

module.exports = {
    generateRiskZones,
};