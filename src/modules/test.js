const gtfs = require('gtfs');
const mongoose = require('mongoose');
const gtfs_utils = require('./gtfs-utils');
const cutting_shapes = require('./cutting_shapes');
const fs = require('fs');


async function main2() {
  await mongoose.connect('mongodb://localhost:27017/Wien');
  const queryTrips = Object.assign({ shape_id: '11-WLB-j17-1.1.H' }, gtfs_utils.queryWithAgencyKey);
  const queryShapes = Object.assign({ shape_id: '11-WLB-j17-1.1.H' }, gtfs_utils.queryWithAgencyKey);
  const trips = await gtfs.getTrips(queryTrips);
  const shapes = await gtfs.getShapes(queryShapes);
  const stopTimesList = [];
  await Promise.all(trips.map(async (trip) => {
    const stopTimes = await gtfs.getStoptimes({ trip_id: trip.trip_id }, projection = {
      _id: 0, trip_id: 0, pickup_type: 0, stop_sequence: 0, drop_off_type: 0, agency_key: 0,
    });
    stopTimesList.push(stopTimes);
  }));
  const fragmentedShapes = cutting_shapes.fractionShape(shapes[0], stopTimesList);
  const path = '../../output/test.json';

  fs.writeFile(path, `${JSON.stringify(fragmentedShapes)}`, (error) => {
    if (error) {
      console.error(`write error:  ${error.message}`);
    } else {
      console.log(`Successful Write to ${path}`);
    }
  });
  await mongoose.connection.close();
}

async function exampleIn() {
  await mongoose.connect('mongodb://localhost:27017/Wien');
  const agency_key = 'Wien_gtfs';
  const query = { agency_key, shape_id: { $in: ['11-WLB-j17-1.10.R', '11-WLB-j17-1.1.H'] } };
  const trips = await gtfs.getTrips(query);
  console.log(JSON.stringify(trips));
  await mongoose.connection.close();
}

exampleIn();
