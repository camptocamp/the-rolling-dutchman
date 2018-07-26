const MAXIMUM_TRAVEL_HOURS = 20;

function mod(n, m) {
  return ((n % m) + m) % m;
}

function toMinutes(hour, minutes) {
  return (hour * 60) + minutes;
}

function toSeconds(hour, minutes, seconds) {
  return (toMinutes(hour, minutes) * 60) + seconds;
}

function hhmmssToSeconds(hhmmss) {
  const hhmmssArray = hhmmss.split(':');
  const hours = parseInt(hhmmssArray[0], 10);
  const minutes = parseInt(hhmmssArray[1], 10);
  const seconds = parseInt(hhmmssArray[2], 10);
  return toSeconds(hours, minutes, seconds);
}

function differenceInSeconds(start, end) {
  let secondsDifferences = hhmmssToSeconds(end) - hhmmssToSeconds(start);
  secondsDifferences = mod(secondsDifferences, 24 * 60 * 60);
  if (secondsDifferences > MAXIMUM_TRAVEL_HOURS * 60 * 60) {
    throw Error(`A travel seems to take more than ${MAXIMUM_TRAVEL_HOURS} hours,
    are you sure that startTime: ${start} and endTime ${end} are not inverted ?`);
  }
  return secondsDifferences;
}

class FragmentedTrip {
  constructor(startTime, endTime, tripId, timeIdleAtEnd) {
    this.startTime = startTime;
    this.endTime = endTime;
    this.tripId = tripId;
    this.timeIdleAtEnd = timeIdleAtEnd;
  }
  toJSON() {
    return {
      startTime: this.startTime,
      travelTime: differenceInSeconds(this.startTime, this.endTime),
      tripId: this.tripId,
      timeIdleAtEnd: this.timeIdleAtEnd,
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
function splitShapeUsingShapeDist(shapeDistList, stopTimes) {
  const splittedList = [];
  let beginIndex = shapeDistList.indexOf(stopTimes[0].shape_dist_traveled);
  if (beginIndex === -1) {
    throw Error('Unexpected format in shapes, shape dist traveled must correspond in shapes.txt and stop_times.txt');
  }
  stopTimes.slice(1, stopTimes.length).forEach((stopTime) => {
    const lastIndex = shapeDistList.indexOf(stopTime.shape_dist_traveled);
    splittedList.push(shapeDistList.slice(beginIndex, lastIndex + 1));
    beginIndex = lastIndex;
  });
  return splittedList;
}

// Currently does not support express -> check this format
function splitShapeUsingSequence(shapeSequences, stopTimes) {
  const shapeSequencesString = shapeSequences.map(int => int.toString());
  let lastIndexSequence = 0;
  let currentIndexSequence = 0;
  let currentIndexStopTimes = 0;
  const splittedShape = [];

  while (currentIndexSequence < shapeSequencesString.length) {
    const prefix = stopTimes[currentIndexStopTimes].stop_sequence.toString();
    if (!shapeSequencesString[currentIndexSequence].startsWith(prefix)) {
      const fragmentToPush = shapeSequencesString.slice(lastIndexSequence, currentIndexSequence);
      if (fragmentToPush.length === 0) {
        throw Error('Unexpected format of shape_pt_sequence, expected shape_pt_sequence to be prefixed by stop_sequence');
      }
      splittedShape.push(fragmentToPush);
      currentIndexStopTimes += 1;
      lastIndexSequence = currentIndexSequence;
    }
    currentIndexSequence += 1;
  }
  const fragmentToPush = shapeSequencesString.slice(lastIndexSequence, currentIndexSequence);
  if (fragmentToPush.length === 0) {
    throw Error('Unexpected format of shape_pt_sequence, expected shape_pt_sequence to be prefixed by stop_sequence');
  }
  splittedShape.push(fragmentToPush);
  if (splittedShape.length !== stopTimes.length - 1) {
    throw Error('Shape was not split accordingly to stopTimes');
  }
  return splittedShape;
}

function splitShape(shapePoints, stopTimes) {
  if (shapePoints[0].shape_dist_traveled !== undefined) {
    const shapeDists = shapePoints.map(shapePoint => shapePoint.shape_dist_traveled);
    return splitShapeUsingShapeDist(shapeDists, stopTimes);
  }
  // We assume that shapes are separated by shape_pt_sequence
  const shapeSequences = shapePoints.map(shapePoint => shapePoint.shape_pt_sequence);
  return splitShapeUsingSequence(shapeSequences, stopTimes);
}
/**
 * Use the shared information of shape_dist_traveled in GTFS shapes and GTFS stop_times
 * to cut the shape in smaller parts containing fragmented trips
 * @param {} fractionedShape
 * @param {*} shapeDists
 * @param {*} stopTimes
 */
function createFragmentsForStopTimes(fractionedShape, shapePoints, stopTimes) {
  const stopTimesSorted = stopTimes.sort((a, b) => a.stop_sequence - b.stop_sequence);
  const splittedShape = splitShape(shapePoints, stopTimesSorted);
  let startIndex = 0;
  let endIndex = 0;
  splittedShape.forEach((fragment, index) => {
    endIndex = startIndex + (fragment.length - 1);
    const key = makeKey(
      startIndex,
      endIndex,
    );
    startIndex = endIndex;
    let idleTimeAtTheEnd = 0;
    if (index + 1 < stopTimesSorted.length &&
      stopTimes[index + 1].departure_time !== stopTimes[index + 1].arrival_time) {
      const departureSeconds = hhmmssToSeconds(stopTimesSorted[index + 1].departure_time);
      const arrivalSeconds = hhmmssToSeconds(stopTimesSorted[index + 1].arrival_time);
      idleTimeAtTheEnd = departureSeconds - arrivalSeconds;
    }
    if (stopTimesSorted[index].departure_time === stopTimesSorted[index + 1].arrival_time) {
      console.log('travelTime of zero');
    }
    const fragmentedTrip = new FragmentedTrip(
      stopTimesSorted[index].departure_time,
      stopTimesSorted[index + 1].arrival_time,
      stopTimes[0].trip_id,
      idleTimeAtTheEnd,
    );
    fractionedShape.addTrip(key, fragmentedTrip);
  });
}

function sortShape(shapePoints) {
  shapePoints.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);
}

function removeDuplicatesInSortedShape(shapePoints) {
  return shapePoints.filter((item, pos, array) => {
    const isFirstPos = !pos;
    if (isFirstPos) {
      return true;
    }
    const isSameThatPrecedent = item.shape_pt_lat === array[pos - 1].shape_pt_lat &&
      item.shape_pt_lon === array[pos - 1].shape_pt_lon;
    return !isSameThatPrecedent;
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
  stopTimesList.forEach((stopTimes) => {
    createFragmentsForStopTimes(fractionedShape, shapePointsFiltered, stopTimes);
  });
  return fractionedShape;
}

export {
  fractionShape, makeKey, createFragmentsForStopTimes,
  FragmentedTrip, FractionedShape, differenceInSeconds,
  toMinutes, removeDuplicatesInSortedShape,
};
