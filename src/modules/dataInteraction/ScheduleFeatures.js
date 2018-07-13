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
import VirtualClock from './virtualClock';


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

function GeoJSONToCrossFilterFacts(geojson, referenceDate, millisecondsTimeStamp) {
  // query rendered features return the properties as String or numeric value
  // c.f docs -> https://www.mapbox.com/mapbox-gl-js/api/#map#queryrenderedfeatures
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
      properties: geojson.properties,
      end: begin + minutesInMilliseconds(trip.travelTime),
    };
  });
}

class ScheduleFeatures {
  constructor(map) {
    this.map = map;
    this.virtualClock = this.virtualClock;
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
    // On less than 10% of the shapes the coords are unvalid
    // there is a level of nesting in excess
    coords = flattenArray(coords);
    distance = turf.distance(coords[0], coords[coords.length - 1], options);
  }
  const lineString = turf.lineString(coords);
  const millisecondsPassed = timeStamp - activeTrip.begin;
  const fractionTraveled = millisecondsPassed / (activeTrip.end - activeTrip.begin);
  const geojsonPoint = turf.along(lineString, distance * fractionTraveled, options);
  return Object.assign(geojsonPoint, { properties: activeTrip.properties });
}


function animateBuses(scheduleFeatures, map, timeStamp, virtualClock) {
  virtualClock.updateTime(timeStamp);
  const virtualTime = virtualClock.getTime();
  const activeTrips = scheduleFeatures.getActiveTrips(virtualTime);
  const pointFeatures = activeTrips.map((activeTrip) => {
    return getPointFromActiveTrip(activeTrip, virtualTime);
  });
  const geojson = featuresToGeoJSON(pointFeatures);
  map.getSource(animatedBusesSourceId).setData(geojson);
  requestAnimationFrame(timestamp => animateBuses(scheduleFeatures, map, timestamp, virtualClock));
}

function initSources(map) {
  const virtualClock = new VirtualClock();
  map.addSource(animatedBusesSourceId, {
    type: 'geojson',
    data: featuresToGeoJSON([pointToGeoJSONFeature([0, 0])]),
  });
  map.addLayer({
    id: animatedBusesLayerId,
    source: animatedBusesSourceId,
    type: 'circle',
    paint: {
      'circle-radius': 6,
      'circle-color': '#ff0000',
    },
  });
  const scheduleFeatures = new ScheduleFeatures(map, virtualClock);
  scheduleFeatures.update();
  map.on('moveend', () => scheduleFeatures.update());
  animateBuses(scheduleFeatures, map, performance.now(), virtualClock);
}
export { initSources, animatedBusesLayerId };
