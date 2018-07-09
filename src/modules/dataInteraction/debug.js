import { animatedBusesLayerId } from './ScheduleFeatures';

function filterFeatures(features) {
  const gtfsLayerIds = ['stops', 'routes', 'shapes_fragmented'];
  return features.filter(feature => gtfsLayerIds.includes(feature.layer.id));
}

function activateClickCallback(map) {
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point);
    const filteredFeatures = filterFeatures(features);
    document.getElementById('features').innerHTML = JSON.stringify(filteredFeatures, null, 2);
  });
}

function clickToSeeBuses(map) {
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [animatedBusesLayerId] });
    document.getElementById('features').innerHTML = JSON.stringify(features, null, 2);
  });
}

export { activateClickCallback, clickToSeeBuses };
