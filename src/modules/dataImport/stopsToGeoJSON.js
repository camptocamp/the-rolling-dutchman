/* eslint no-await-in-loop: 0 */ // --> OFF
const gtfs = require('gtfs');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

const batchSize = 1000;

function getDirectoryName(configPath, outputPath) {
  return `${path.dirname(configPath)}/${path.dirname(outputPath)}`;
}

function getFileNameExtension(outputPath) {
  return `${path.extname(outputPath)}`;
}

function getFileNameWithoutExtension(outputPath) {
  return path.basename(outputPath, getFileNameExtension(outputPath));
}

function getOutputFileOfBatch(configPath, outputPath, batchNumber) {
  return `${getDirectoryName(configPath, outputPath)}/${getFileNameWithoutExtension(outputPath)}${batchNumber}${getFileNameExtension(outputPath)}`;
}

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
  console.log('hey');
  const configPath = process.argv[2];
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(JSON.stringify(config));
  mongoose.connect(config.mongoUrl);
  const agencyKeys = config.agencies.map(agency => agency.agency_key);
  let stopIds = await gtfs.getStops(
    {
      agency_key: {
        $in: agencyKeys,
      },
    },
    {
      stop_id: 1,
    },
  );
  console.log(`${stopIds.length} stops found, going by batch of ${batchSize}`);

  let batchNumber = 0;
  mkdirp(getDirectoryName(configPath, config.outputPath));
  while (stopIds.length > 0) {
    const remaining = stopIds.splice(batchSize);
    const stops = await batch(stopIds.map(stopIdObj => stopIdObj.stop_id), agencyKeys);
    await fs.writeFile(
      getOutputFileOfBatch(configPath, config.outputPath, batchNumber),
      JSON.stringify(stops),
    );
    stopIds = remaining;
    batchNumber += 1;
    console.log(`${batchNumber * batchSize} stops written`);
  }
  mongoose.connection.close();
}

main();
