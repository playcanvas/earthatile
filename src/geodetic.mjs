// Constants for WGS84 ellipsoid
const a = 6378137; // semi-major axis
const f = 1 / 298.257223563; // flattening
const e = Math.sqrt(2 * f - f * f); // eccentricity

/**
 * Convert a geodetic coordinate to a Cartesian coordinate.
 *
 * @param {number} lon - longitude.
 * @param {number} lat - latitude.
 * @param {number} alt - altitude.
 * @returns {number[]} A Cartesian coordinate as [x, y, z].
 */
function geodeticToCartesian(lon, lat, alt) {
    // Convert degrees to radians
    lon *= (Math.PI / 180);
    lat *= (Math.PI / 180);

    // Calculate N, the radius of curvature in the prime vertical
    const N = a / Math.sqrt(1 - Math.pow(e, 2) * Math.sin(lat) * Math.sin(lat));

    // Calculate Cartesian coordinates
    const x = (N + alt) * Math.cos(lat) * Math.cos(lon);
    const y = (N + alt) * Math.cos(lat) * Math.sin(lon);
    const z = ((1 - Math.pow(e, 2)) * N + alt) * Math.sin(lat);

    return [x, y, z];
}

/**
 * Convert a Cartesian coordinate to a geodetic coordinate.
 *
 * @param {number} x - x coordinate.
 * @param {number} y - y coordinate.
 * @param {number} z - z coordinate.
 * @returns {number[]} A geodetic coordinate as [longitude, latitude, altitude].
 */
function cartesianToGeodetic(x, y, z) {
    const e2 = e * e; // eccentricity squared
    const precision = 1e-12; // precision value for iterative refinement

    const p = Math.sqrt(x * x + z * z); // distance from minor axis

    // Calculate longitude
    let lon = Math.atan2(-z, x);

    // Calculate latitude iteratively
    let lat = Math.atan2(y, p * (1 - e2)); // initial latitude approximation
    let latPrev = Infinity;
    let N;
    while (Math.abs(lat - latPrev) > precision) {
        latPrev = lat;
        N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
        lat = Math.atan2(y + e2 * N * Math.sin(lat), p);
    }

    // Calculate altitude
    const alt = p / Math.cos(lat) - N;

    // Convert to degrees
    lon *= (180 / Math.PI);
    lat *= (180 / Math.PI);

    return [lon, lat, alt];
}

export { cartesianToGeodetic, geodeticToCartesian };
