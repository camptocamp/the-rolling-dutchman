/* eslint-disable arrow-body-style */
import differenceInMilliseconds from 'date-fns/difference_in_milliseconds';
import * as turf from '@turf/turf';
import crossfilter from 'crossfilter2';
import {
  pointToGeoJSONFeature,
  getDateFromHHMM,
  flattenArray,
  featuresToGeoJSON,
} from './utils';


const animatedBusesSourceId = 'buses';
const animatedBusesLayerId = 'busLayer';
const layerWithScheduleId = 'shapes_fragmented';

function getPerformanceLikeFromDate(date, referenceDate, millisecondsTimeStamp) {
  return differenceInMilliseconds(date, referenceDate) + millisecondsTimeStamp;
}

function getPerformanceLikeFromHHMM(HHMM, referenceDate, millisecondsTimeStamp) {
  return getPerformanceLikeFromDate(
    getDateFromHHMM(HHMM, referenceDate),
    referenceDate,
    millisecondsTimeStamp,
  );
}

function minutesInMilliseconds(minutes) {
  return minutes * 60 * 1000;
}

function millisecondsInMinutes(milliseconds) {
  return (milliseconds / 60) / 1000;
}

class ScheduleFeature {
  constructor(geojson, referenceDate, millisecondsTimeStamp) {
    if (typeof geojson === 'string') {
      this.geojson = JSON.parse(geojson);
    } else {
      this.geojson = geojson;
    }
    this.geojson.properties.trips = JSON.parse(this.geojson.properties.trips);
    this.geojson.properties.modifiedTrips = this.geojson.properties.trips
      .map((trip) => {
        const begin = getPerformanceLikeFromHHMM(
          trip.startTime,
          referenceDate,
          millisecondsTimeStamp,
        );
        return { begin, end: begin + minutesInMilliseconds(trip.travelTime) };
      });
  }
  getGeoJSON() {
    return this.geojson;
  }

  getTrips() {
    return this.geojson.properties.modifiedTrips;
  }
  getCoordinates() {
    return this.geojson.geometry.coordinates;
  }
  getActiveTripsWithCoordinates(timeStamp) {
    const now = timeStamp;
    const trips = this.getTrips().filter((trip) => {
      const { begin } = trip;
      const { end } = trip;
      const hackyCondition = millisecondsInMinutes(end - begin) < 10;
      return begin < now && end > now && hackyCondition;
    });
    return {
      trips,
      coordinates: this.getCoordinates(),
    };
  }
}
function GeoJSONToCrossFilterFacts(geojson, referenceDate, millisecondsTimeStamp) {
  // No idea why but query rendered features deliver trips as strings and not array
  // even though it is an array in the original geojson
  const trips = JSON.parse(geojson.properties.trips);
  return trips.map((trip) => {
    const begin = getPerformanceLikeFromHHMM(
      trip.startTime,
      referenceDate,
      millisecondsTimeStamp,
    );
    return {
      trip,
      coordinates: geojson.geometry.coordinates,
      begin,
      end: begin + minutesInMilliseconds(trip.travelTime),
    };
  });
}

class ScheduleFeatures {
  constructor(map) {
    this.map = map;
  }
  update() {
    this.referenceDate = new Date();
    this.millisecondsTimeStamp = performance.now();
    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [layerWithScheduleId],
    });
    const crossfilterFactArray = features.map(feature =>
      GeoJSONToCrossFilterFacts(feature, this.referenceDate, this.millisecondsTimeStamp));
    const crossfilterFacts = flattenArray(crossfilterFactArray);
    this.schedule = crossfilter(crossfilterFacts);
    this.beginDimension = this.schedule.dimension(d => d.begin);
    this.endDimension = this.schedule.dimension(d => d.end);
    this.counter = 0;
  }
  updateFilters(timeStamp) {
    this.beginDimension.filterFunction(d => d <= timeStamp);
    this.endDimension.filterFunction(d => d >= timeStamp);
  }
  getActiveTrips(timeStamp) {
    if (this.activeTrips === undefined || this.counter === 60) {
      this.updateFilters(timeStamp);
      this.counter = 0;
      this.activeTrips = this.schedule.allFiltered();
    }
    this.counter += 1;
    return this.activeTrips;
  }
}


function getPointFromActiveTrip(activeTrip, timeStamp) {
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
    console.log('issue to be considered in priority in coords of geojson file');
    coords = flattenArray(coords);
    distance = turf.distance(coords[0], coords[coords.length - 1], options);
  }
  const lineString = turf.lineString(coords);
  const millisecondsPassed = timeStamp - activeTrip.begin;
  const fractionTraveled = millisecondsPassed / (activeTrip.end - activeTrip.begin);
  return turf.along(lineString, distance * fractionTraveled, options);
}


function animateBuses(scheduleFeatures, map, timeStamp) {
  const activeTrips = scheduleFeatures.getActiveTrips(timeStamp);
  const pointFeatures = activeTrips.map((activeTrip) => {
    return getPointFromActiveTrip(activeTrip, timeStamp);
  });
  const geojson = featuresToGeoJSON(pointFeatures);
  map.getSource(animatedBusesSourceId).setData(geojson);
  requestAnimationFrame(timestamp => animateBuses(scheduleFeatures, map, timestamp));
}

function initSources(map) {
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
  map.on('moveend', () => scheduleFeatures.update());
  animateBuses(scheduleFeatures, map, performance.now());
}
export { initSources };
