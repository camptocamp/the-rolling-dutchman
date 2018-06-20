/* eslint-disable arrow-body-style */
import {
  parseHHMM,
  getMomentFromHHMM,
  flattenArray,
} from './utils';
import {
  pointToGeoJSONFeature,
  featuresToGeoJSON,
} from '../geojson-utils';

const moment = require('moment');
const turf = require('@turf/turf');

const animatedBusesSourceId = 'buses';
const animatedBusesLayerId = 'busLayer';
const layerWithScheduleId = 'shapes_fragmented';

class ScheduleFeature {
  constructor(geojson) {
    if (typeof geojson === 'string') {
      this.geojson = JSON.parse(geojson);
    } else {
      this.geojson = geojson;
    }
    this.geojson.properties.trips = JSON.parse(this.geojson.properties.trips);
  }

  getTrips() {
    return this.geojson.properties.trips;
  }
  getCoordinates() {
    return this.geojson.geometry.coordinates;
  }
  getActiveTripsWithCoordinates(timeStamp) {
    const now = timeStamp;
    const trips = this.getTrips().filter((trip) => {
      const begin = getMomentFromHHMM(trip.startTime);
      const end = moment(begin).add(trip.travelTime, 'minutes');
      const hackyCondition = trip.travelTime < 10;
      return begin.isBefore(now) && end.isAfter(now) && hackyCondition;
    });
    return {
      trips,
      coordinates: this.getCoordinates(),
    };
  }
}

class ScheduleFeatures {
  constructor(map) {
    this.map = map;
  }
  update() {
    this.features = this.map.queryRenderedFeatures(undefined, {
      layers: [layerWithScheduleId],
    }).map(geojson => new ScheduleFeature(geojson));
  }
  getActiveTrips(map, timeStamp) {
    const activeTrips = this.features.map(geojsonFeature => geojsonFeature
      .getActiveTripsWithCoordinates(timeStamp));
    return activeTrips.filter(activeTrip => activeTrip.trips.length > 0);
  }
}


function getPointsFromActiveTrip(activeTrip, timeStamp) {
  if (activeTrip.length === 0) {
    return [];
  }
  let coords = activeTrip.coordinates;
  const options = {
    units: 'kilometers',
  };
  let distance;
  try {
    distance = turf.distance(coords[0], coords[coords.length - 1], options);
  } catch (error) {
    coords = flattenArray(coords);
    distance = turf.distance(coords[0], coords[coords.length - 1], options);
  }
  const lineString = turf.lineString(coords);
  return activeTrip.trips.map((trip) => {
    const momentPassed = timeStamp.diff(getMomentFromHHMM(trip.startTime, timeStamp));
    const timeElapsed = moment.duration(momentPassed);
    const fractionTraveled = timeElapsed / moment.duration(trip.travelTime, 'minutes');
    return turf.along(lineString, distance * fractionTraveled, options);
  });
}


function animateBuses(scheduleFeatures, map, counter) {
  const timeStampOfFrame = moment();
  const activeTrips = scheduleFeatures.getActiveTrips(timeStampOfFrame);
  const pointsFeatureNotFlatten = activeTrips.map((activeTrip) => {
    return getPointsFromActiveTrip(activeTrip, timeStampOfFrame);
  });
  const pointsFeature = flattenArray(pointsFeatureNotFlatten);
  const geojson = featuresToGeoJSON(pointsFeature);
  map.getSource(animatedBusesSourceId).setData(geojson);
  requestAnimationFrame(() => animateBuses(scheduleFeatures, map, counter + 1));
}

function initSources(map, counter) {
  map.addSource(animatedBusesSourceId, {
    type: 'geojson',
    data: featuresToGeoJSON([pointToGeoJSONFeature([0, 0])]),
  });
  map.addLayer({
    id: animatedBusesLayerId,
    source: animatedBusesSourceId,
    type: 'circle',
    paint: {
      'circle-radius': 3,
      'circle-color': '#ff0000',
    },
  });
  const scheduleFeatures = new ScheduleFeatures(map);
  scheduleFeatures.update();
  map.on('move', () => scheduleFeatures.update());
  animateBuses(scheduleFeatures, map, counter);
}
export { initSources };
