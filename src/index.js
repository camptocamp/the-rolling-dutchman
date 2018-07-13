import mapboxgl from 'mapbox-gl';
import { clickToSeeBuses, activateClickCallback } from './modules/dataInteraction/debug';
import { initSources } from './modules/dataInteraction/ScheduleFeatures';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'styles/osm-liberty-custom-NL.json',
  center: [5.1214, 52.0907],
  zoom: 12,
});
map.showTileBoundaries = true;
activateClickCallback(map);
map.on('load', () => initSources(map));
