import 'bootstrap/dist/css/bootstrap.min.css';
import mapboxgl from 'mapbox-gl';
import {
  showFragmentedShapeBeginAndEnd,
  clickToSeeBuses,
} from './modules/dataInteraction/debug';
import { initSources } from './modules/dataInteraction/ScheduleFeatures';


function initMap(style, center, zoom) {
  const map = new mapboxgl.Map({
    container: 'map',
    style,
    center,
    zoom,
  });
  map.showTileBoundaries = true;
  clickToSeeBuses(map);
  showFragmentedShapeBeginAndEnd(map);
  map.on('load', () => initSources(map));
}

fetch('configWeb.json').then(value => value.json()).then((json) => {
  initMap(json.style, json.center, json.zoom);
});
