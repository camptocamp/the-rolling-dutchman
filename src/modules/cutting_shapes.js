const _ = require('lodash');

class FragmentedTrip {
  constructor(start_time, end_time) {
    this.startTime = start_time;
    this.endTime = end_time;
  }

  toJSON() {
    return { startTime: this.startTime, endTime: this.endTime };
  }
}

class FractionedShape {
  constructor(parentShape) {
    this.parentShape = parentShape;
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
  toGeoJSONFeatures() {
    if (this.geoJSONFeatures === undefined) {
      this.createInnerGeoJSON();
    }
    return this.geoJSONFeatures;
  }
  createInnerGeoJSON() {
    this.geoJSONFeatures = [];
    Object.entries(this.innerDictionary).forEach((entry) => {
      const feature = {};
      const key = entry[0];
      const splittedKey = key.split(',');
      const beginIndex = parseInt(splittedKey[0], 10);
      const endIndex = parseInt(splittedKey[1], 10);
      const lineString = this.parentShape.slice(beginIndex, endIndex + 1)
        .map(shapePoint => shapePoint.loc);
      feature.type = 'Feature';
      feature.geometry = { type: 'LineString', coordinates: lineString };
      feature.properties = { trips: entry[1], parentShapeId: this.parentShape[0].shape_id };
      this.geoJSONFeatures.push(feature);
    });
  }
}

function makeKey(firstIndex, secondIndex) {
  return `${firstIndex.toString()},${secondIndex.toString()}`;
}

// assume that both begin to zero
// warning, potentially bugged function
function splitShapeDistByStopTimes(shapeDistList, stopTimes) {
  const splittedList = [];
  let beginIndex = 0;
  stopTimes.slice(1, stopTimes.length).forEach((stopTime) => {
    const lastIndex = shapeDistList.indexOf(stopTime.shape_dist_traveled);
    splittedList.push(shapeDistList.slice(beginIndex, lastIndex + 1));
    beginIndex = lastIndex + 1;
  });
  return splittedList;
}

function createFragmentsForStopTimes(fractionedShape, shapeDists, stopTimes) {
  if (shapeDists[0] !== stopTimes[0].shape_dist_traveled) {
    throw Error(`Expecting the shape_dist_traveled for both list to be zero for both but are: ${shapeDists[0]
    } and: ${stopTimes[0].shape_dist_traveled}`);
  }
  const splittedShape = splitShapeDistByStopTimes(shapeDists, stopTimes);
  let acc = 0;
  splittedShape.forEach((fragment, index) => {
    const nextIndex = acc + fragment.length;
    const key = makeKey(acc, nextIndex);
    const fragmentedTrip = new FragmentedTrip(
      stopTimes[index].departure_time,
      stopTimes[index + 1].departure_time,
    );
    acc = nextIndex;
    fractionedShape.addTrip(key, fragmentedTrip);
  });
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
// returns a fractionShape with empty dictionary if stopTimesList is emptym can be a problem
function fractionShape(shapePoints, stopTimesList) {
  const fractionedShape = new FractionedShape(shapePoints);
  const shapeDists = shapePoints.map(shapePoint => shapePoint.shape_dist_traveled);
  stopTimesList.forEach((stopTimes) => {
    createFragmentsForStopTimes(fractionedShape, shapeDists, stopTimes);
  });
  return fractionedShape;
}

export { fractionShape, makeKey, createFragmentsForStopTimes, FragmentedTrip, FractionedShape };
