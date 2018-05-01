const gtfs = require('gtfs');

function FractionedShapeBuilder(key, trips) {
  this.key = key;
  this.trips = trips;
  this.addTrip = (fragmentedTrip) => {
    this.trips.push(fragmentedTrip);
  };
}

function FragmentedTrip(start_time, end_time) {
  this.st = start_time;
  this.et = end_time;
}


function makeKey(first_index, second_index) {
  return `${first_index.toString()}${second_index.toString()}`;
}

function createFragmentsForStopTimes(fractionedShapeDict, shapeDists, stopTimes) {
  if (shapeDists[0] !== stopTimes[0].shape_dist_traveled) {
    throw Error(`Expecting the shape_dist_traveled for both list to be zero for both but are: ${shapeDists[0]
    } and: ${stopTimes[0].shape_dist_traveled}`);
  }
  const lastindexShapeDist = 0;
  for (let indexStopTimes = 1; indexStopTimes < stopTimes.length; indexStopTimes++) {
    for (let indexShapeDist = lastindexShapeDist; indexShapeDist < shapeDists.length; indexShapeDist++) {
      if (shapeDists[indexShapeDist] === stopTimes[indexStopTimes].shape_dist_traveled) {
        const key = makeKey(lastindexShapeDist, indexShapeDist);
        const fragmentedTrip = new FragmentedTrip(
          stopTimes[indexStopTimes - 1].departure_time,
          stopTimes[indexStopTimes].arrival_time,
        );
        if (fractionedShapeDict[key] === undefined) {
          fractionedShapeDict[key] = new FractionedShapeBuilder(key, []);
        }
        fractionedShapeDict[key].addTrip(fragmentedTrip);
      }
    }
  }
}

/*
*  tripId have a unique shapeId
*  a list of stopTimes defining the service
*  Multiple points with shape_dist_traveled for a shapeId
*  -> Create a fragmentedShape containing multiples trips (stopTimes)
* Take in input an array -> shapePoints corresponding to a shapeId
* an array of array -> each element of the array is a trip i.e an array of
* stoptimes with shape_dist_traveled
*/
exports.fractionShape = (shapePoints, stopTimesList) => {
  const fractionedShapeDict = {};
  const shapeDists = shapePoints.map(shapePoint => shapePoint.shape_dist_traveled);
  stopTimesList.forEach((stopTimes) => {
    createFragmentsForStopTimes(fractionedShapeDict, shapeDists, stopTimes);
  });
  return fractionedShapeDict;
};
