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

export default { activateClickCallback };
