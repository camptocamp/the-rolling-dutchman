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
const endPointLayerId = 'endPointLayer';
const endPointSourceId = 'endPointSource';

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
    const end = begin + minutesInMilliseconds(trip.travelTime);
    const endIdleTime = end + minutesInMilliseconds(trip.timeIdleAtEnd);
    return {
      trip,
      coordinates: geojson.geometry.coordinates,
      begin,
      properties: geojson.properties,
      end,
      endIdleTime,
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
    this.endDimension = this.schedule.dimension(d => d.endIdleTime);
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
/**
 * Using the library turf, compute the point along the fragmented shape using the activeTrip
 * and the current timeStamp.
 * Returns undefined is the timeStamp is before the activeTrip (When the time is going back)
 * @param {*} activeTrip
 * @param {*} timeStamp
 */
function getPointFromActiveTrip(activeTrip, timeStamp) {
  if (activeTrip.length === 0) {
    return [];
  }
  let coords = activeTrip.coordinates;
  const options = {
    units: 'kilometers',
  };
  let lineString;
  try {
    lineString = turf.lineString(coords);
  } catch (error) {
    // On less than 10% of the shapes the coords are unvalid
    // there is a level of nesting in excess
    coords = flattenArray(coords);
    lineString = turf.lineString(coords);
  }
  const lengthOfLineString = turf.length(lineString);
  const millisecondsPassed = timeStamp - activeTrip.begin;
  const fractionTraveled = millisecondsPassed / (activeTrip.end - activeTrip.begin);
  if (fractionTraveled < 0) {
    return undefined;
  }
  // turf.along gives a GeoJSON poit along the lineString with a distance traveled
  // If the distance is superior to the length of the lineString, it gives the last coordinate
  // We abuse this feature for the idleTime at a stop
  const geojsonPoint = turf.along(lineString, lengthOfLineString * fractionTraveled, options);
  const properties = Object.assign({
    begin: coords[0],
    end: coords[coords.length - 1],
  }, activeTrip.properties);
  return Object.assign(geojsonPoint, {
    properties,
  });
}


function animateBuses(scheduleFeatures, map, timeStamp, virtualClock, counter) {
  virtualClock.updateTime(timeStamp);
  if (counter % 60 === 0) {
    virtualClock.updateSlider();
  }
  const virtualTime = virtualClock.getTime();
  const activeTrips = scheduleFeatures.getActiveTrips(virtualTime);
  const pointFeatures = activeTrips.map((activeTrip) => {
    return getPointFromActiveTrip(activeTrip, virtualTime);
  });
  const pointFeaturesFiltered = pointFeatures.filter(feature => feature !== undefined);
  const geojson = featuresToGeoJSON(pointFeaturesFiltered);
  map.getSource(animatedBusesSourceId).setData(geojson);
  requestAnimationFrame(timestamp => animateBuses(
    scheduleFeatures,
    map,
    timestamp,
    virtualClock, counter + 1,
  ));
}


function initSourceEndPoint(map) {
  map.addSource(endPointSourceId, {
    type: 'geojson',
    data: featuresToGeoJSON([pointToGeoJSONFeature([0, 0])]),
  });
  map.addLayer({
    id: endPointLayerId,
    source: endPointSourceId,
    type: 'circle',
    paint: {
      'circle-radius': 10,
      'circle-color': '#00ff00',
    },
  });
}

function initAnimateBusSource(map) {
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
}

function initSources(map) {
  const virtualClock = new VirtualClock();
  initSourceEndPoint(map);
  initAnimateBusSource(map);
  const scheduleFeatures = new ScheduleFeatures(map, virtualClock);
  scheduleFeatures.update();
  map.on('moveend', () => scheduleFeatures.update());
  animateBuses(scheduleFeatures, map, performance.now(), virtualClock, 0);
}
export {
  initSources,
  animatedBusesLayerId,
  endPointLayerId,
  endPointSourceId,
};
