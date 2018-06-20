import mapboxgl from 'mapbox-gl';
import { activateClickCallback } from './modules/dataInteraction/debug';
import { initSources } from './modules/dataInteraction/ScheduleFeatures';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'styles/osm-liberty-extended.json',
  center: [16.3738, 48.2082],
  zoom: 16,
});
map.showTileBoundaries = true;
activateClickCallback(map);
map.on('load', () => initSources(map, 0));
