import 'bootstrap/dist/css/bootstrap.min.css';
import mapboxgl from 'mapbox-gl';
import {
  showFragmentedShapeBeginAndEnd,
  clickToSeeBuses,
} from './modules/dataInteraction/debug';
import { initSources } from './modules/dataInteraction/ScheduleFeatures';


function initMap(style, center, zoom) {
  mapboxgl.accessToken = 'pk.eyJ1IjoibmhvZmVyIiwiYSI6ImNqZHViYWNnMjJzbXIyd3Q3MGI4emU5ZTAifQ.AKITUlaDoEzIkU2SGn6e1A';
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v9',
    center,
    zoom,
  });
  // map.showTileBoundaries = true;
  clickToSeeBuses(map);
  showFragmentedShapeBeginAndEnd(map);
  map.on('load', () => {
    Object.entries(style.sources).forEach(([id, source]) => map.addSource(id, source));
    style.layers.forEach(layer => map.addLayer(layer));
    let once = true;
    map.on('sourcedata', (event) => {
      if (once && event.isSourceLoaded) {
        once = false;
        initSources(map);
      }
    });
  });
}

async function getConfig(path) {
  const response = await fetch(path);
  const jsonObject = await response.json();
  if (jsonObject.alias !== undefined) {
    return getConfig(jsonObject.alias);
  }
  return jsonObject;
}

async function initMapByConfig(configPath) {
  const config = await getConfig(configPath);
  const styleResponse = await fetch(config.style);
  const styleJson = await styleResponse.json();
  initMap(styleJson, config.center, config.zoom);
}

initMapByConfig('configWeb.json');
