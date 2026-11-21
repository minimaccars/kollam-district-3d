"""Package Kerala district outlines from the existing Open Data Kerala snapshot.

Run from the repository root. Source metadata is retained in README/attribution;
contributor account metadata and unrelated OSM features are not shipped.
"""
import json
import re
from pathlib import Path
from shapely.geometry import shape, mapping

root = Path(__file__).resolve().parents[1]
source = root / 'data/raw/districts.geojson'
data = json.loads(source.read_text(encoding='utf-8-sig'))
features = []
for feature in data['features']:
    properties = feature['properties']
    if properties.get('admin_level') != '5' or properties.get('type') != 'boundary':
        continue
    geometry = shape(feature['geometry'])
    if geometry.geom_type not in ('Polygon', 'MultiPolygon'):
        continue
    geometry = geometry.simplify(0.001, preserve_topology=True)
    centre = geometry.representative_point()
    features.append({'type': 'Feature', 'properties': {
        'name': re.sub(r'\s+district$', '', properties['name'], flags=re.I), 'ml': properties.get('name:ml', properties['name']),
        'centre': [round(centre.x, 5), round(centre.y, 5)],
        'bounds': [round(v, 5) for v in geometry.bounds],
    }, 'geometry': mapping(geometry)})
assert len(features) == 14, f'Expected 14 Kerala districts; found {len(features)}'
features.sort(key=lambda feature: feature['properties']['name'])
target = root / 'dist/data/kerala-districts.geojson'
target.write_text(json.dumps({'type': 'FeatureCollection', 'features': features},
                             ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Packaged {len(features)} Kerala districts ({target.stat().st_size:,} bytes)')
