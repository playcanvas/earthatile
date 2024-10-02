import { length } from './math.mjs';

/**
 * Manager class for {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification#readme 3D Tiles},
 * an open standard for streaming massive heterogeneous 3D geospatial datasets.
 */
class TileManager {
    /** @type {string} */
    apiKey;

    /** @type {string} */
    apiUrl;

    /** @type {string} */
    session;

    handlers;

    expandedNodes = new Set();

    /** @type {Map<string, boolean>} */
    contentHidden = new Map();

    /**
     * Creates a new instance of the 3D map tile manager.
     *
     * @param {string} apiKey - Your Google Maps 3D Tiles API key.
     * @param {string} apiUrl - The base URL from where tiles data is loaded. Defaults to https://tile.googleapis.com/.
     * @param {{load: Function, unload: Function, show: Function, hide: Function}} handlers - Engine-specific node handlers.
     */
    constructor(apiKey, apiUrl = 'https://tile.googleapis.com/', handlers = {}) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.handlers = handlers;
    }

    /**
     * Fetch a tile set JSON file.
     *
     * @param {string} url - The URL of the tile set JSON file.
     * @returns {object} The tile set data.
     */
    async fetchJson(url) {
        const response = await fetch(url);

        // If the fetch was unsuccessful, throw an error
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Start the tile manager. This function will load the root JSON and expand the root node.
     */
    async start() {
        // Fetch the root tileset JSON
        const url = `${this.apiUrl}v1/3dtiles/root.json?key=${this.apiKey}`;
        const json = await this.fetchJson(url);
        this.expandNode(json.root);
    }

    /**
     * Checks if a node is in the camera's view frustum.
     *
     * @param {object} node - The node to test.
     * @returns {boolean} True if in view and false otherwise.
     */
    isInView(node) {
        // Implement logic here to check if the node's bounding volume is in the camera's view frustum.
        // This will depend on the specifics of your camera and bounding volume representations.
        // For simplicity, this function currently returns true for all nodes.
        return true;
    }

    /**
     * Checks if a node is within the level-of-detail switch distance.
     *
     * @param {object} node - The node to test.
     * @param {number[]} cameraPos - 3 dimensional array containing the camera position.
     * @returns {boolean} True if in range and false otherwise.
     */
    isInRange(node, cameraPos) {
        const [bx, by, bz, xx, xy, xz, yx, yy, yz, zx, zy, zz] = node.boundingVolume.box;
        const dx = bx - cameraPos[0];
        const dy = bz - cameraPos[1]; // NOTE: box is Z-up
        const dz = -by - cameraPos[2];
        const dist = length(dx, dy, dz);
        const lenx = length(xx, xy, xz);
        const leny = length(yx, yy, yz);
        const lenz = length(zx, zy, zz);
        const switchDist = Math.max(lenx, leny, lenz, 100) * 4;

        return dist < switchDist;
    }

    async loadContent(node, parentNode) {
        if (node.content) {
            const uri = node.content.uri;
            if (uri.includes('.glb') && this.handlers.load) {
                await this.handlers.load(node);
                if (this.contentHidden.get(node.content.uri)) {
                    this.handlers.hide(node);
                }
            } else if (uri.includes('.json')) {
                let url;
                if (this.session) {
                    url = `${this.apiUrl}${uri}?key=${this.apiKey}&session=${this.session}`;
                } else {
                    url = `${this.apiUrl}${uri}&key=${this.apiKey}`;
                    const params = new URLSearchParams(new URL(url).search);
                    this.session = params.get('session');
                }

                const json = await this.fetchJson(url);
                node.children = [json.root]; // eslint-disable-line require-atomic-updates

                // Hide the parent node only when all children are loaded if fetched from a JSON file
                (parentNode.hideChildDependency ||= []).push(json.root);
                json.root.hideParent = parentNode;
            }
        }
    }

    unloadContent(node) {
        if (node.content) {
            const uri = node.content.uri;
            if (uri.includes('.glb') && this.handlers.unload) {
                this.handlers.unload(node);
            } else if (uri.includes('.json')) {
                delete node.children;
            }
        }
    }

    /**
     * Expanding a node will initiate async loads of its children's content. When all
     * children are loaded, the parent node itself is hidden.
     *
     * @param {object} node - The node to expand.
     */
    async expandNode(node) {
        if (!this.expandedNodes.has(node)) {
            this.expandedNodes.add(node);

            // Initiate the loading of all child nodes
            if (node.children) {
                await Promise.all(node.children.map(child => this.loadContent(child, node)));
            }

            // Hide the expanded node's content only when there are no additional dependencies to load
            if (node.content && node.content.uri.includes('.glb') && !node.hideChildDependency) {
                this.handlers.hide(node);
                this.contentHidden.set(node.content.uri, true);
            }

            // Hide the parent node when all children are loaded if fetched from a JSON file
            if (node.hideParent && node.hideParent.hideChildDependency.length) {
                node.hideParent.hideChildDependency = node.hideParent.hideChildDependency.filter(n => n !== node);
                if (node.hideParent.hideChildDependency.length === 0) {
                    // When all children are loaded, see if the parent node should be hidden
                    if (node.hideParent.content && node.hideParent.content.uri.includes('.glb')) {
                        this.handlers.hide(node.hideParent);
                        this.contentHidden.set(node.hideParent.content.uri, true);
                    }
                    delete node.hideParent.hideChildDependency;
                }
                delete node.hideParent;
            }
        }
    }

    /**
     * Collapsing a node will unload all content from child nodes. The node's content
     * is then shown (since it should already be loaded).
     *
     * @param {object} node - The node to collapse.
     */
    collapseNode(node) {
        // Unload all children
        if (node.children) {
            for (const child of node.children) {
                if (child.content) {
                    this.handlers.unload(child);
                }
            }
        }

        // Show this node
        if (node.content) {
            this.handlers.show(node);
            this.contentHidden.set(node.content.uri, false);
        }

        this.expandedNodes.delete(node);
    }

    /**
     * Update the tile manager based on the current camera position.
     *
     * @param {number[]} cameraPos - The camera position as [x, y, z].
     */
    update(cameraPos) {
        const expandedNodes = Array.from(this.expandedNodes);
        for (const node of expandedNodes) {
            // If the node is not in range or in view, collapse it
            if (!(this.isInView(node) && this.isInRange(node, cameraPos))) {
                this.collapseNode(node);
            }

            if (node.children) {
                for (const child of node.children) {
                    if (child.children && this.isInView(child) && this.isInRange(child, cameraPos)) {
                        this.expandNode(child).catch(err => console.error(`Error expanding node: ${node.id}`, err));
                    }
                }
            }
        }
    }
}

export { TileManager };
