import { animatedBusesLayerId, endPointSourceId } from './ScheduleFeatures';
import { pointToGeoJSONFeature, flattenArray, featuresToGeoJSON } from './utils';

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
    const features = map.queryRenderedFeatures(e.point, {
      layers: [animatedBusesLayerId],
    });
    document.getElementById('features').innerHTML = JSON.stringify(features, null, 2);
  });
}

function showFragmentedShapeBeginAndEnd(map) {
  window.map = map;
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [animatedBusesLayerId],
    });
    const endPointFeatures = features.map((feature) => {
      const beginPoint = pointToGeoJSONFeature(JSON.parse(feature.properties.begin));
      const endPoint = pointToGeoJSONFeature(JSON.parse(feature.properties.end));
      Object.assign(beginPoint.properties, feature.properties);
      Object.assign(beginPoint.properties, feature.properties);
      return [beginPoint, endPoint];
    });
    const endPointFeaturesFlatten = flattenArray(endPointFeatures);
    const geojson = featuresToGeoJSON(endPointFeaturesFlatten);
    map.getSource(endPointSourceId).setData(geojson);
  });
}
export {
  activateClickCallback,
  clickToSeeBuses,
  showFragmentedShapeBeginAndEnd,
};
