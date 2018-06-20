const moment = require('moment');

function parseHHMM(HHMM, delimiter) {
  if (delimiter === undefined) {
    delimiter = ':';
  }
  const array = HHMM.split(delimiter);
  return array.map(element => parseInt(element, 10));
}

function getMomentFromHHMM(HHMM, timeStamp, delimiter) {
  const hourMinutes = parseHHMM(HHMM, delimiter);
  return moment(timeStamp).hours(hourMinutes[0]).minutes(hourMinutes[1]).seconds(0);
}

function flattenArray(array) {
  return [].concat(...array);
}

function pointToGeoJSONFeature(point) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: point,
    },
  };
}

function featuresToGeoJSON(features) {
  return {
    type: 'FeatureCollection',
    features,
  };
}

export { parseHHMM, getMomentFromHHMM, flattenArray, pointToGeoJSONFeature, featuresToGeoJSON };
