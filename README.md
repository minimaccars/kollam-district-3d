# Kollam District 3D

An adaptation of jasimcm/kozhikode-3d, preserving its original CSS, typography, 42-degree camera lens, default perspective, materials, lighting, controls and postcards. Geography is newly generated for Kollam, not relocated Kozhikode assets.

## Run the supplied build

Install Node.js, then run `node server.mjs` from this folder. Open http://127.0.0.1:5184. The supplied build needs no API key. Google Fonts requires network access. Do not open index.html directly from a file URL: module and asset requests need HTTP.

## Coverage and limitations

Building centroids are clipped to the Open Data Kerala / OSM Kollam district polygon. Geographic context covers longitude 76.40–77.30 and latitude 8.70–9.22. The backdrop extends farther. Zoom in for detailed buildings; distant chunk retention is bounded for memory. Footprint omissions and estimated heights remain; the About panel reports mapped-height provenance.

Tree placement, roof styles, facade colors, illuminated windows, water shading and street-light glow are generated. This is not a traffic/flood solver. The lighthouse and bridge are approximate stylised geometry. Viewpoint pins are approximate area locations, not surveyed entrance/navigation coordinates. Jatayu sculpture and Palaruvi waterfall are not custom-modelled.

The district boundary is a 2021 community/OSM snapshot, intended for visualization, not legal/survey decisions. Terrain is not a survey DEM. The sun model illustrates January 15. Satellite imagery is historical (2020).

## Data rebuild

Python 3.12 with duckdb, numpy, shapely, pillow, requests. Run from pipeline/ after creating data/raw and retrieving the district GeoJSON from Open Data Kerala:

1. `python fetch_region.py` — STAC-selected Overture partitions, release 2026-10-21.0.
2. `python fetch_tiles.py s2020` — cached imagery and elevation downloads.
3. `python build.py` — district-clipped building and tree chunks, terrain/masks.
4. `python roads.py` — MUST run after build.py; final road schema includes widths.
5. `python extras_kollam.py` — district boundary and localities.
6. Run `python package-data.py` from the project root to copy and shard generated assets into dist/data/.

Pipeline scripts retain upstream file names. The original Blender scripts are retained as upstream references, not used in the Kollam build. Kollam landmarks are generated directly in dist/src/models.js.

## Attribution

- Original renderer, UI and theme: https://github.com/jasimcm/kozhikode-3d . No top-level code license was present in the supplied archive; preserve attribution and obtain the author's permission for redistribution where needed.
- Buildings/transport/water/localities: Overture Maps Foundation 2026-10-21.0, including OpenStreetMap contributors (ODbL), Google Open Buildings and Microsoft building contributions.
- Boundary: https://github.com/opendatakerala/kl_district ; OpenStreetMap contributors, ODbL.
- Terrain: Mapzen / AWS Terrain Tiles and their underlying elevation sources.
- Satellite: Sentinel-2 cloudless 2020 © EOX IT Services GmbH, contains modified Copernicus Sentinel data 2020, CC BY-NC-SA 4.0. Non-commercial imagery; select a suitable licensed source before commercial reuse.
- Tourism descriptions: https://kollam.nic.in/en/tourist-places/ and Kerala Tourism destination information, paraphrased.
- Three.js: upstream bundled dependency; preserve its license.

