import mapboxgl from 'mapbox-gl';
import { activateClickCallback } from './modules/dataInteraction/debug';
import { initSources } from './modules/dataInteraction/ScheduleFeatures';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'styles/osm-liberty-custom-NL.json',
  center: [16.3738, 48.2082],
  zoom: 5,
});
map.showTileBoundaries = true;
activateClickCallback(map);
map.on('load', () => initSources(map));
