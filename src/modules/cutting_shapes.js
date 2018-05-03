class FragmentedTrip {
  constructor(start_time, end_time) {
    this.startTime = start_time;
    this.endTime = end_time;
  }

  toJSON() {
    return { startTime: this.startTime, endTime: this.endTime };
  }
}

class FractionedShapeDict {
  constructor() {
    this.innerDictionary = {};
  }
  addTrip(key, fragmentedTrip) {
    if (this.innerDictionary[key] === undefined) {
      this.innerDictionary[key] = [fragmentedTrip];
    } else {
      this.innerDictionary[key].push(fragmentedTrip);
    }
  }
  toJSON() {
    const returnObject = {};
    const entries = Object.entries(this.innerDictionary);
    entries.forEach((entry) => {
      const object = {};
      object[entry[0]] = entry[1].map(fractionedTrip => fractionedTrip.toJSON());
      Object.assign(returnObject, object);
    });
    return returnObject;
  }
}

function makeKey(first_index, second_index) {
  return `${first_index.toString()}${second_index.toString()}`;
}

function createFragmentsForStopTimes(fractionedShapeDict, shapeDists, stopTimes) {
  if (shapeDists[0] !== stopTimes[0].shape_dist_traveled) {
    throw Error(`Expecting the shape_dist_traveled for both list to be zero for both but are: ${shapeDists[0]
    } and: ${stopTimes[0].shape_dist_traveled}`);
  }
  let lastindexShapeDist = 0;
  for (let indexStopTimes = 1; indexStopTimes < stopTimes.length; indexStopTimes++) {
    for (let indexShapeDist = lastindexShapeDist; indexShapeDist < shapeDists.length;
      indexShapeDist++) {
      if (shapeDists[indexShapeDist] === stopTimes[indexStopTimes].shape_dist_traveled) {
        const key = makeKey(lastindexShapeDist, indexShapeDist);
        lastindexShapeDist = indexShapeDist;
        const fragmentedTrip = new FragmentedTrip(
          stopTimes[indexStopTimes - 1].departure_time,
          stopTimes[indexStopTimes].arrival_time,
        );
        fractionedShapeDict.addTrip(key, fragmentedTrip);
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
function fractionShape(shapePoints, stopTimesList) {
  const fractionedShapeDict = new FractionedShapeDict();
  const shapeDists = shapePoints.map(shapePoint => shapePoint.shape_dist_traveled);
  stopTimesList.forEach((stopTimes) => {
    createFragmentsForStopTimes(fractionedShapeDict, shapeDists, stopTimes);
  });
  return fractionedShapeDict;
}

export { fractionShape, makeKey, createFragmentsForStopTimes, FragmentedTrip, FractionedShapeDict };
