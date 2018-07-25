/* eslint-disable */
import 'babel-polyfill'
import {
  makeKey,
  createFragmentsForStopTimes,
  FractionedShape,
  FragmentedTrip,
  differenceInMinutes,
  toMinutes,
  dropSeconds,
  removeDuplicatesInSortedShape
} from '../src/modules/dataImport/cuttingShapes';
const assert = require('assert');


function numbersToShapePoints(numbers) {
  return numbers.map(number => {
    return {
      shape_dist_traveled: number
    }
  });
}

function stringToShapePointsSequence(numbers) {
  return numbers.map(number => {
    return {
      shape_pt_sequence: number
    }
  });
}
describe('make key', () => {
  it('should return correct string key from 2 integers', () => {
    assert.equal(makeKey(2, 3), ('2,3'));
  });
});

function mockUpStopTime(arrival_time, departure_time, shape_dist_traveled, stop_sequence) {
  return {
    departure_time,
    arrival_time,
    shape_dist_traveled,
    stop_sequence,
  };
}

function removeShapeDistTraveledField(object) {
  return Object.assign(object, {
    shape_dist_traveled: undefined
  });
}
describe('to Minutes', () => {
  it('should return the correct value', () => {
    assert.equal(toMinutes(1, 2), 62);
  })
})

describe('differenceInMinutes', () => {
  const hour = '08:11:00';
  const hour2 = '08:15:00';
  const hour3 = '08:15:43';
  const hour4 = '09:08:00';
  it('should throw an error if the difference an inversion in the time is probable', () => {
    assert.throws(() => differenceInMinutes(hour2, hour), Error);
  })
  it('should return the correct difference', () => {
    assert.equal(differenceInMinutes(hour, hour2), 4);
  })
  it('should return the result in minutes', () => {
    assert.equal(differenceInMinutes(hour, hour4), 57);
  })
  it('should not care about seconds', () => {
    assert.equal(differenceInMinutes(hour, hour3), 4);
  })
})

describe('createFragmentsForStopTimes', () => {
  const hour1 = '08:11:00';
  const hour2 = '08:13:00';
  const hour3 = '12:15:00';
  const hour4 = '12:22:00';
  const strippedHour1 = dropSeconds(hour1);
  const strippedHour2 = dropSeconds(hour2);
  const strippedHour3 = dropSeconds(hour3);
  const stopTimes1 = [mockUpStopTime(hour1, hour1, 0, 1),
    mockUpStopTime(hour2, hour2, 1, 2), mockUpStopTime(hour3, hour4, 3, 3)
  ];
  const stopTimes2 = [mockUpStopTime(hour1, hour1, 0), mockUpStopTime(hour2, hour2, 3)];
  const shapeDist = numbersToShapePoints([0, 1, 3]);
  const firstResult = {
    "0,1": [{
      startTime: strippedHour1,
      tripId: undefined,
      timeIdleAtEnd: 0,
      travelTime: 2
    }],
    "1,2": [{
      startTime: strippedHour2,
      tripId: undefined,
      timeIdleAtEnd: 7,
      travelTime: 242
    }]
  };
  const secondResult = {
    "0,2": [{
      startTime: strippedHour1,
      tripId: undefined,
      timeIdleAtEnd: 0,
      travelTime: 2
    }]
  };
  it('should not leave shape Dictionary unchanged', () => {
    const shapeDict1 = new FractionedShape('asd');
    createFragmentsForStopTimes(shapeDict1, shapeDist, stopTimes1);
    assert.notEqual(shapeDict1.toJSON(), {});
  })
  it('should split a shape according to the shape_dist_traveled', () => {
    const shapeDict1 = new FractionedShape('asd');
    createFragmentsForStopTimes(shapeDict1, shapeDist, stopTimes1);
    assert.deepEqual(shapeDict1.toJSON(), firstResult);
  });

  it('should not split the trip for an express', () => {
    const shapeDict2 = new FractionedShape('sdafa');
    createFragmentsForStopTimes(shapeDict2, shapeDist, stopTimes2);
    assert.deepEqual(shapeDict2.toJSON(), secondResult);
  });
  it('should not change the results if fragment are encoded in shape_pt_sequence', () => {
    const shapeDict1 = new FractionedShape('asd');
    const stopTimes3 = stopTimes1.map(object => removeShapeDistTraveledField(object));
    const shape_pt_sequence = stringToShapePointsSequence(["11", "12", "21", "22"]);
    createFragmentsForStopTimes(shapeDict1, shape_pt_sequence, stopTimes3);
    assert.deepEqual(shapeDict1.toJSON(), firstResult);
  });
});

describe('the method addTrip', () => {
  const fractionedShape = new FractionedShape('parent');
  const trip1 = new FragmentedTrip("08:10:11", "08:12:11")
  const trip2 = new FragmentedTrip("08:10:11", "08:14:11")
  const key = "0,4";
  it('should add a simpleTrip correctly', () => {
    fractionedShape.addTrip(key, trip1);
    assert.equal(fractionedShape.innerDictionary[key][0], trip1)
  })
  it('should append if an existing trip exist', () => {
    fractionedShape.addTrip(key, trip2);
    assert.equal(fractionedShape.innerDictionary[key].length, 2)
  })
})

function arrayCoordsToArrayShapeLonLat(array) {
  return array.map(coords => {
    return {
      shape_pt_lon: coords[0],
      shape_pt_lat: coords[1]
    }
  });
}

describe('the function removeDuplicatesInSortedShape', () => {
  const array = [
    [1, 1],
    [1, 2],
    [1, 2],
    [3, 3],
    [4, 4]
  ];
  const newArray = arrayCoordsToArrayShapeLonLat(array);
  it('should filter following duplicates with same lon lat in an array', () => {
    assert.deepEqual(
      removeDuplicatesInSortedShape(newArray),
      arrayCoordsToArrayShapeLonLat([
        [1, 1],
        [1, 2],
        [3, 3],
        [4, 4]
      ])
    );
  })
})