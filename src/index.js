import 'bootstrap/dist/css/bootstrap.min.css';
import mapboxgl from 'mapbox-gl';
import {
  showFragmentedShapeBeginAndEnd,
  clickToSeeBuses,
} from './modules/dataInteraction/debug';
import { initSources  } from './modules/dataInteraction/ScheduleFeatures';


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
  map.on('load', () => {
    map.addLayer({
      id: 'wms-test-layer',
      type: 'raster',
      source: {
        type: 'raster',
        tiles: [
          'http://carto.tadao.fr/tadao/wsgi/mapserv_proxy?ogcserver=source+for+image%2Fpng&bbox={bbox-epsg-3857}&format=image/png&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&srs=EPSG:3857&width=256&height=256&layers=arret',
        ],
        tileSize: 256,
      },
      paint: {},
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
  initMap(config.style, config.center, config.zoom);
}

initMapByConfig('configWeb.json');
