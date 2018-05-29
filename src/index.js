import mapboxgl from 'mapbox-gl';


const map = new mapboxgl.Map({
  container: 'map',
  style: 'styles/osm-liberty-extended.json',
  center: [16.3738, 48.2082],
  zoom: 10,
});
map.showTileBoundaries = true;
