import setHours from 'date-fns/set_hours';
import setMinutes from 'date-fns/set_minutes';
import setSeconds from 'date-fns/set_seconds';

function parseHHMM(HHMM, delimiter) {
  if (delimiter === undefined) {
    delimiter = ':';
  }
  const array = HHMM.split(delimiter);
  return array.map(element => parseInt(element, 10));
}

function getDateFromHHMM(HHMM, timeStamp, delimiter) {
  const hourMinutes = parseHHMM(HHMM, delimiter);
  return setHours(setMinutes(setSeconds(timeStamp, 0), hourMinutes[1]), hourMinutes[0]);
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

export { parseHHMM, getDateFromHHMM, flattenArray, pointToGeoJSONFeature, featuresToGeoJSON };
