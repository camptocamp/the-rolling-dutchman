import { featuresToGeoJSON } from './geojson-utils';

const cutting_shapes = require('./cutting_shapes');
const services_utils = require('./services-utils');
const gtfs = require('gtfs');
const gtfs_utils = require('./gtfs-utils');
const mongoose = require('mongoose');
const fs = require('fs');

function allProgress(proms, progress_cb) {
  let d = 0;
  progress_cb(0);
  proms.forEach((p) => {
    p.then(
      () => {
        d++;
        progress_cb((d * 100) / proms.length);
      },
      () => {
        d++;
        progress_cb((d * 100) / proms.length);
      },
    );
  });
  return Promise.all(proms);
}

function getStopTimesFromTripIds(tripIds, stopTimesList) {
  return tripIds.map(async (trip) => {
    let stopTimes = [];
    try {
      stopTimes = await gtfs.getStoptimes({ trip_id: trip.trip_id }, {
        _id: 0, trip_id: 0, pickup_type: 0, stop_sequence: 0, drop_off_type: 0, agency_key: 0,
      });
    } catch (error) {
      console.log(error.message);
    }
    stopTimesList.push(stopTimes);
  });
}

async function connect() {
  mongoose.connect('mongodb://localhost:27017/Wien');
}

async function closeConnection() {
  mongoose.connection.close();
}

function getFragmentShapes(shapes, servicesIds) {
  return shapes.map(async (shapePoints) => {
    try {
      const tripQuery = Object.assign(
        { shape_id: shapePoints[0].shape_id, service_id: { $in: servicesIds } },
        gtfs_utils.queryWithAgencyKey,
      );
      const tripIds = await gtfs.getTrips(tripQuery, { trip_id: 1 });
      const stopTimesList = [];
      if (tripIds.length !== 0) {
        const promises = getStopTimesFromTripIds(tripIds, stopTimesList);
        await Promise.all(promises);
        const test = cutting_shapes.fractionShape(shapePoints, stopTimesList);
        return test;
      }
      return [];
    } catch (error) {
      console.log(error);
      return [];
    }
  });
}

function filterByFactor(array, factor) {
  return array.filter((elem, index) => (index % factor) === 0);
}

async function main() {
  await connect();
  const servicesActives = await services_utils.getServicesActiveToday();
  const shapes = await gtfs.getShapes(Object.assign(
    // {shape_id: {$in: ["11-WLB-j17-1.1.H", "11-WLB-j17-1.10.R"] }},
    gtfs_utils.queryWithAgencyKey));
  //const filteredShapes = shapes.filter((shape, index) => (index % 10) === 0);
  const servicesIds = servicesActives.map(service => service.service_id);
  const proms = getFragmentShapes(shapes, servicesIds);
  allProgress(proms, p => console.log(`% Done = ${p.toFixed(2)}`));
  let fragmentShapes;
  try {
    fragmentShapes = await Promise.all(proms);
  } catch (error) {
    console.log(error.messge);
  }
  const path = '../../output/full.geojson';
  // filter shapes which have no services actives
  const fragmentShapesFiltered = fragmentShapes.filter(obj => obj.toGeoJSONFeatures !== undefined);
  // currently a shape without trip gets dumped, TODO see if it is a correct behaviour
  const features = fragmentShapesFiltered.map(fragmentShape => fragmentShape.toGeoJSONFeatures());
  const geojson = featuresToGeoJSON(features.reduce(
    (accumulator, currentValue) => accumulator.concat(currentValue),
    [],
  ));
  fs.writeFile(path, JSON.stringify(geojson), (error) => {
    if (error) {
      console.error(`write error:  ${error.message}`);
    } else {
      console.log(`Successful Write to ${path}`);
    }
  });
  await closeConnection();
}

main();
