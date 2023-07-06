/**
 * Convert a geodetic coordinate to a Cartesian coordinate.
 *
 * @param {number} lon - longitude.
 * @param {number} lat - latitude.
 * @param {number} alt - altitude.
 * @returns {number[]} A Cartesian coordinate as [x, y, z].
 */
function geodeticToCartesian(lon, lat, alt) {
    // Constants for WGS84 ellipsoid
    const a = 6378137; // semi-major axis
    const f = 1 / 298.257223563; // flattening
    const e = Math.sqrt(2 * f - f * f); // eccentricity

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
    // Constants for WGS84 ellipsoid
    const a = 6378137; // semi-major axis
    const f = 1 / 298.257223563; // flattening
    const b = a * (1 - f); // semi-minor axis
    const e = Math.sqrt(2 * f - f * f); // eccentricity

    const p = Math.sqrt(x * x + z * z); // distance from minor axis
    const th = Math.atan2(a * y, b * p); // angle between p and y

    // Calculate longitude
    let lon = Math.atan2(-z, x);

    // Calculate latitude
    let lat = Math.atan2((y + Math.pow(e, 2) * b * Math.pow(Math.sin(th), 3)), (p - Math.pow(e, 2) * a * Math.pow(Math.cos(th), 3)));

    // Calculate N, the radius of curvature in the prime vertical
    const N = a / Math.sqrt(1 - Math.pow(e, 2) * Math.sin(lat) * Math.sin(lat));

    // Calculate altitude
    const alt = p / Math.cos(lat) - N;

    // Convert to degrees
    lon *= (180 / Math.PI);
    lat *= (180 / Math.PI);

    return [lon, lat, alt];
}

export { cartesianToGeodetic, geodeticToCartesian };
