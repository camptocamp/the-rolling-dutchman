/* eslint-disable no-await-in-loop */
import { featuresToGeoJSON } from '../dataInteraction/utils';
import { getDirectoryName, getOutputFileOfBatch } from '../filesIO/utils';
import { getSelectorOnAgencyKeys } from './gtfsUtils';

const cuttingShapes = require('./cuttingShapes');
const servicesUtils = require('./servicesUtils');
const gtfs = require('gtfs');
const mongoose = require('mongoose');
const fs = require('fs');
const mkdirp = require('mkdirp');

const BATCH_SIZE = 100;

function allProgress(proms, progressCallBack) {
  let d = 0;
  progressCallBack(0);
  proms.forEach((p) => {
    p.then(
      () => {
        d += 1;
        progressCallBack((d * 100) / proms.length);
      },
      () => {
        d += 1;
        progressCallBack((d * 100) / proms.length);
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
        _id: 0, pickup_type: 0, drop_off_type: 0, agency_key: 0,
      });
    } catch (error) {
      console.log(error.message);
    }
    stopTimesList.push(stopTimes);
  });
}
async function connect(url) {
  mongoose.connect(url);
}
async function closeConnection() {
  mongoose.connection.close();
}
function getFragmentShapes(shapes, servicesIds, agencyKeys) {
  return shapes.map(async (shapePoints) => {
    try {
      const tripQuery = Object.assign(
        { shape_id: shapePoints[0].shape_id, service_id: { $in: servicesIds } },
        getSelectorOnAgencyKeys(agencyKeys),
      );
      const tripIds = await gtfs.getTrips(tripQuery, { trip_id: 1 });
      const stopTimesList = [];
      if (tripIds.length !== 0) {
        const promises = getStopTimesFromTripIds(tripIds, stopTimesList);
        await Promise.all(promises);
        const test = cuttingShapes.fractionShape(shapePoints, stopTimesList);
        return test;
      }
      return [];
    } catch (error) {
      console.log(error);
      return [];
    }
  });
}
// Function useful for debugging -> smaller subset makes exporting to GeoJSON faster
/*
function filterByFactor(array, factor) {
  return array.filter((elem, index) => (index % factor) === 0);
} */

async function getScheduleGeoJSONFromShapes(shapesIds, servicesIds, agencyKeys) {
  const shapes = await gtfs.getShapes({ shape_id: { $in: shapesIds } });
  const proms = getFragmentShapes(shapes, servicesIds, agencyKeys);
  allProgress(proms, p => console.log(`% Done = ${p.toFixed(2)}`));
  let fragmentShapes;
  try {
    fragmentShapes = await Promise.all(proms);
  } catch (error) {
    console.log(error.messge);
  }
  // filter shapes which have no services actives
  const fragmentShapesFiltered = fragmentShapes.filter(obj => obj.toGeoJSONFeatures !== undefined);
  // currently a shape without trip gets dumped, TODO see if it is a correct behaviour
  const features = fragmentShapesFiltered.map(fragmentShape => fragmentShape.toGeoJSONFeatures());
  const geojson = featuresToGeoJSON(features.reduce(
    (accumulator, currentValue) => accumulator.concat(currentValue),
    [],
  ));
  return geojson;
}

async function getServicesIds(config) {
  if (config.date !== undefined) {
    return servicesUtils.getIdsOfServicesActiveAtStringDate(config.date);
  }
  return servicesUtils.getIdsOfServicesActiveToday();
}

async function exportScheduleToGeoJSON() {
  const configPath = process.argv[2];
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  await connect(config.mongoUrl);
  const servicesIds = await getServicesIds(config);
  const agencyKeys = config.agencies.map(agency => agency.agency_key);
  let shapesIds = await gtfs.getShapeIds();
  const totalShapes = shapesIds.length;
  // const filteredShapes = shapes.filter((shape, index) => (index % 10) === 0);
  let batchNumber = 0;
  mkdirp(getDirectoryName(configPath, config.outputPathForSchedule));
  while (shapesIds.length > 0) {
    const remaining = shapesIds.splice(BATCH_SIZE);
    const schedule = await getScheduleGeoJSONFromShapes(shapesIds, servicesIds, agencyKeys);
    await fs.writeFile(
      getOutputFileOfBatch(configPath, config.outputPathForSchedule, batchNumber),
      JSON.stringify(schedule),
    );
    console.log(`${(batchNumber * BATCH_SIZE) + shapesIds.length} of ${totalShapes} shapes processed`);
    shapesIds = remaining;
    batchNumber += 1;
  }
  console.log(`schedule written in directory \
  ${getDirectoryName(configPath, config.outputPathForSchedule)}`);
  await closeConnection();
}

exportScheduleToGeoJSON();
