const gtfs = require('gtfs');
const mongoose = require('mongoose');
const config = require('../../../config-import-stops.json');
const fs = require('fs');

mongoose.connect(config.mongoUrl);
async function main() {
  const prefixPath = '../../../';
  const agencyKeys = config.agencies.map(agency => agency.agency_key);
  const stops = await gtfs.getStopsAsGeoJSON({
    agency_key: {
      $in: agencyKeys,
    },
  });
  try {
    fs.writeFile(`${prefixPath}${config.outputPath}`, JSON.stringify(stops));
    console.log('write successful');
  } catch (error) {
    console.error('could not write file');
    console.error(error.message);
  }
  mongoose.connection.close();
}

main();
