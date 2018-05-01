const cutting_shapes = require('./cutting_shapes');
const services_utils = require('./services-utils');
const gtfs = require('gtfs');
const gtfs_utils = require('./gtfs-utils');
const mongoose = require('mongoose');
const fs = require('fs');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/Wien');
  const servicesActives = await services_utils.getServicesActiveToday();
  const shapes = await gtfs.getShapes(Object.assign({}, gtfs_utils.queryWithAgencyKey));
  const servicesIds = servicesActives.map(service => service.service_id);
  const finalDict = {};
  await Promise.all(shapes.map(async (shapePoints) => {
    const tripQuery = Object.assign(
      { shape_id: shapePoints[0].shape_id, service_id: { $in: servicesIds } },
      gtfs_utils.queryWithAgencyKey,
    );
    const tripIds = await gtfs.getTrips(tripQuery, { trip_id: 1 });
    const stopTimesList = [];
    await Promise.all(tripIds.map(async (trip) => {
      const stopTimes = await gtfs.getStoptimes({ trip_id: trip.trip_id }, {
        _id: 0, trip_id: 0, pickup_type: 0, stop_sequence: 0, drop_off_type: 0, agency_key: 0,
      });
      stopTimesList.push(stopTimes);
    }));
    const fractionedDict = cutting_shapes.fractionShape(shapePoints, stopTimesList);
    finalDict[shapePoints[0].shape_id] = fractionedDict;
  }));
  const path = '../../output/finalDict.json';

  fs.writeFile(path, JSON.stringify(finalDict), (error) => {
    if (error) {
      console.error(`write error:  ${error.message}`);
    } else {
      console.log(`Successful Write to ${path}`);
    }
  });
  await mongoose.connection.close();
}

main();
