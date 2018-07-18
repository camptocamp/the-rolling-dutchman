const MAXIMUM_TRAVEL_HOURS = 20;

function mod(n, m) {
  return ((n % m) + m) % m;
}

function dropSeconds(hhmmss) {
  const time = hhmmss.split(':');
  if (time.length !== 3) {
    throw new Error(`FragmentedTrip contains an unexpected format of schedule,
     expected hh:mm:ss, got: ${hhmmss}`);
  }
  return time.slice(0, 2).join(':');
}

function toMinutes(hour, minutes) {
  return (hour * 60) + minutes;
}

function differenceInMinutes(start, end) {
  const firstHoursMinutes = dropSeconds(start).split(':');
  const secondHoursMinutes = dropSeconds(end).split(':');
  const firstMinutes = parseInt(firstHoursMinutes[1], 10);
  const firstHours = parseInt(firstHoursMinutes[0], 10);
  const secondMinutes = parseInt(secondHoursMinutes[1], 10);
  const secondHours = parseInt(secondHoursMinutes[0], 10);
  let minutesDifferences = toMinutes(secondHours, secondMinutes) -
  toMinutes(firstHours, firstMinutes);
  minutesDifferences = mod(minutesDifferences, 24 * 60);
  if (minutesDifferences > MAXIMUM_TRAVEL_HOURS * 60) {
    throw Error(`A travel seems to take more than ${MAXIMUM_TRAVEL_HOURS} hours,
    are you sure that startTime: ${start} and endTime ${end} are not inverted ?`);
  }
  return minutesDifferences;
}

class FragmentedTrip {
  constructor(startTime, endTime, tripId) {
    this.startTime = startTime;
    this.endTime = endTime;
    this.tripId = tripId;
  }
  toJSON() {
    return {
      startTime: dropSeconds(this.startTime),
      travelTime: differenceInMinutes(this.startTime, this.endTime),
      tripId: this.tripId,
    };
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
  let beginIndex = shapeDistList.indexOf(stopTimes[0].shape_dist_traveled);
  if (beginIndex === -1) {
    console.log('blem');
  }
  stopTimes.slice(1, stopTimes.length).forEach((stopTime) => {
    const lastIndex = shapeDistList.indexOf(stopTime.shape_dist_traveled);
    splittedList.push(shapeDistList.slice(beginIndex, lastIndex + 1));
    beginIndex = lastIndex;
  });
  return splittedList;
}

/**
 * Use the shared information of shape_dist_traveled in GTFS shapes and GTFS stop_times
 * to cut the shape in smaller parts containing fragmented trips
 * @param {} fractionedShape 
 * @param {*} shapeDists 
 * @param {*} stopTimes 
 */
function createFragmentsForStopTimes(fractionedShape, shapeDists, stopTimes) {
  const stopTimesSorted = stopTimes.sort((a, b) => a.shape_dist_traveled - b.shape_dist_traveled);
  const splittedShape = splitShapeDistByStopTimes(shapeDists, stopTimesSorted);
  splittedShape.forEach((fragment, index) => {
    const key = makeKey(
      shapeDists.indexOf(fragment[0]),
      shapeDists.indexOf(fragment[fragment.length - 1]),
    );
    const fragmentedTrip = new FragmentedTrip(
      stopTimesSorted[index].departure_time,
      stopTimesSorted[index + 1].arrival_time,
      stopTimes[0].trip_id,
    );
    fractionedShape.addTrip(key, fragmentedTrip);
  });
}

function sortShape(shapePoints) {
  shapePoints.sort((a, b) => a.shape_dist_traveled - b.shape_dist_traveled);
}

function removeDuplicatesInSortedShape(shapePoints) {
  return shapePoints.filter((item, pos, array) => {
    const isFirstPos = !pos;
    return (isFirstPos) || (item.shape_dist_traveled !== array[pos - 1].shape_dist_traveled);
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
  sortShape(shapePoints);
  const shapePointsFiltered = removeDuplicatesInSortedShape(shapePoints);
  const fractionedShape = new FractionedShape(shapePointsFiltered);
  const shapeDists = shapePointsFiltered.map(shapePoint => shapePoint.shape_dist_traveled);
  stopTimesList.forEach((stopTimes) => {
    createFragmentsForStopTimes(fractionedShape, shapeDists, stopTimes);
  });
  return fractionedShape;
}

export {
  fractionShape, makeKey, createFragmentsForStopTimes,
  FragmentedTrip, FractionedShape, differenceInMinutes,
  toMinutes, dropSeconds, removeDuplicatesInSortedShape,
};
