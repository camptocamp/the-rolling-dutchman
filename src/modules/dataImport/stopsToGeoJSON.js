/* eslint-disable no-await-in-loop */

import { getDirectoryName, getOutputFileOfBatch } from '../filesIO/utils';
import { getSelectorOnAgencyKeys } from './gtfsUtils';

const gtfs = require('gtfs');
const mongoose = require('mongoose');
const fs = require('fs');
const mkdirp = require('mkdirp');

const batchSize = 1000;


async function batch(stopIds, agencyKeys) {
  return gtfs.getStopsAsGeoJSON({
    agency_key: {
      $in: agencyKeys,
    },
    stop_id: {
      $in: stopIds,
    },
  });
}

async function main() {
  const configPath = process.argv[2];
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  mongoose.connect(config.mongoUrl);
  const agencyKeys = config.agencies.map(agency => agency.agency_key);
  let stopIds = await gtfs.getStops(
    getSelectorOnAgencyKeys(agencyKeys),
    {
      stop_id: 1,
    },
  );
  console.log(`${stopIds.length} stops found, going by batch of ${batchSize}`);

  let batchNumber = 0;
  mkdirp(getDirectoryName(configPath, config.outputPathForStops));
  while (stopIds.length > 0) {
    const remaining = stopIds.splice(batchSize);
    const stops = await batch(stopIds.map(stopIdObj => stopIdObj.stop_id), agencyKeys);
    await fs.writeFile(
      getOutputFileOfBatch(configPath, config.outputPathForStops, batchNumber),
      JSON.stringify(stops),
    );
    stopIds = remaining;
    batchNumber += 1;
    console.log(`${batchNumber * batchSize} stops written`);
  }
  console.log(`stops written in directory ${getDirectoryName(configPath, config.outputPathForStops)}`);
  mongoose.connection.close();
}

main();
