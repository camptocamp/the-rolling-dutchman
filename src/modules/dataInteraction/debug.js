function activateClickCallback(map) {
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point);
    document.getElementById('features').innerHTML = JSON.stringify(features, null, 2);
  });
}

export { activateClickCallback };