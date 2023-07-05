var Geolocation = pc.createScript('geolocation');

Geolocation.attributes.add('camera', {
    type: 'entity'
})

function geodeticToCartesian(lon, lat, alt) {
    // Constants for WGS84 ellipsoid
    const a = 6378137; // semi-major axis
    const f = 1 / 298.257223563; // flattening
    const e = Math.sqrt(2 * f - f * f); // eccentricity

    // Convert degrees to radians
    lon = lon * (Math.PI / 180);
    lat = lat * (Math.PI / 180);

    // Calculate N, the radius of curvature in the prime vertical
    const N = a / Math.sqrt(1 - Math.pow(e, 2) * Math.sin(lat) * Math.sin(lat));

    // Calculate Cartesian coordinates
    const x = (N + alt) * Math.cos(lat) * Math.cos(lon);
    const y = (N + alt) * Math.cos(lat) * Math.sin(lon);
    const z = ((1 - Math.pow(e, 2)) * N + alt) * Math.sin(lat);

    return [x, y, z];
}

function cartesianToGeodetic(x, y, z) {
    // Constants for WGS84 ellipsoid
    const a = 6378137; // semi-major axis
    const f = 1 / 298.257223563; // flattening
    const b = a * (1 - f); // semi-minor axis
    const e = Math.sqrt(2*f - f*f); // eccentricity

    const p = Math.sqrt(x*x + z*z); // distance from minor axis
    const th = Math.atan2(a*y, b*p); // angle between p and y

    // Calculate longitude
    let lon = Math.atan2(-z, x);

    // Calculate latitude
    let lat = Math.atan2((y + Math.pow(e,2) * b * Math.pow(Math.sin(th), 3)), (p - Math.pow(e,2) * a * Math.pow(Math.cos(th), 3)));

    // Calculate N, the radius of curvature in the prime vertical
    let N = a / Math.sqrt(1 - Math.pow(e, 2) * Math.sin(lat) * Math.sin(lat));

    // Calculate altitude
    let alt = p / Math.cos(lat) - N;

    // Convert to degrees
    lon = lon * (180 / Math.PI);
    lat = lat * (180 / Math.PI);

    return [lon, lat, alt];
}

Geolocation.prototype.teleport = function (lon, lat, alt) {
    const [x, y, z] = geodeticToCartesian(lon, lat, alt ?? 300);

    this.entity.setPosition(-x, -z, y);
    this.camera.setPosition(0, 0, 0);
};

// initialize code called once per entity
Geolocation.prototype.initialize = function() {
    // Create a debug UI
    this.panel = new pcui.Panel({
        collapsible: true,
        headerText: 'CONTROLS',
        hiddern: true,
        width: 400
    });
    document.body.appendChild(this.panel.dom);

    this.longLat = new pcui.VectorInput({
        dimensions: 2,
        readOnly: true
    })
    let group = new pcui.LabelGroup({
        text: 'Geodetic Coord',
        field: this.longLat
    })
    this.panel.append(group);

    const destInput = new pcui.TextInput();
    destInput.on('change', (value) => {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${value}`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const latitude = data[0].lat;
                    const longitude = data[0].lon;
                    this.teleport(longitude, latitude);
                } else {
                    console.log('No results found');
                }
            })
            .catch(error => console.error('Error:', error));
    });
    group = new pcui.LabelGroup({
        text: 'Destination',
        field: destInput
    })
    this.panel.append(group);

    const geoButton = new pcui.Button({
        text: 'Geolocate'
    });
    geoButton.on('click', () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            const { longitude, latitude, altitude } = pos.coords;
            this.teleport(longitude, latitude, altitude);
        });
    });
    group = new pcui.LabelGroup({
        text: '',
        field: geoButton
    })
    this.panel.append(group);
};

// update code called every frame
Geolocation.prototype.update = function(dt) {
    if (this.camera) {
        const pos = this.camera.getPosition().clone();
        const offset = this.entity.getPosition();
        pos.sub(offset);
        const [lon, lat, alt] = cartesianToGeodetic(pos.x, pos.y, pos.z);
        this.longLat.value = [lon, lat];
    }
};
