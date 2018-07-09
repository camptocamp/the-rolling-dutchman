/* eslint-disable */
import 'babel-polyfill'
import {makeKey, createFragmentsForStopTimes, FractionedShape,
   FragmentedTrip, differenceInMinutes, 
   toMinutes, dropSeconds, removeDuplicatesInSortedShape} from '../src/modules/dataImport/cuttingShapes';
const assert = require('assert');

describe('make key', () => {
  it('should return correct string key from 2 integers', () => {
    assert.equal(makeKey(2, 3), ('2,3'));
  });
});

function mockUpStopTime(arrival_time, departure_time, shape_dist_traveled) {
  return {
    departure_time,
    arrival_time,
    shape_dist_traveled,
  };
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
  const shapeDict1 = new FractionedShape('asd');
  const shapeDict2 = new FractionedShape('sdafa');
  const hour1 = '08:11:00';
  const hour2 = '08:13:00';
  const hour3 = '12:15:00';
  const hour4 = '12:22:00';
  const strippedHour1 = dropSeconds(hour1);
  const strippedHour2 = dropSeconds(hour2);
  const strippedHour3 = dropSeconds(hour3);
  const stopTimes1 = [mockUpStopTime(hour1, hour1, 0),
    mockUpStopTime(hour2, hour2, 1), mockUpStopTime(hour3, hour4, 3)];
  const stopTimes2 = [mockUpStopTime(hour1, hour1, 0), mockUpStopTime(hour2, hour2, 3)];
  const shapeDist = [0, 1, 3];
  const firstResult = {"0,1": [{startTime: strippedHour1, travelTime: 2}], "1,2": [{startTime: strippedHour2, travelTime: 242}]};
  const secondResult = {"0,2": [{startTime: strippedHour1, travelTime: 2}]};
  console.log(shapeDict1);
  createFragmentsForStopTimes(shapeDict1, shapeDist, stopTimes1);
  createFragmentsForStopTimes(shapeDict2, shapeDist, stopTimes2);
  let object = shapeDict1.toJSON();
  it('should not leave shape Dictionarry unchanged', () => {
    assert.notEqual(shapeDict1.toJSON(), {});
  })
  it('should split a shape according to the shape_dist_traveled', () => {
    assert.deepEqual(shapeDict1.toJSON(), firstResult);
  });

  it('should not split the trip for an express', () => {
    assert.deepEqual(shapeDict2.toJSON(), secondResult);
  });
});

describe('the method addTrip', () => {
  const fractionedShape = new FractionedShape('parent');
  const trip1 =  new FragmentedTrip("08:10:11", "08:12:11")
  const trip2 =  new FragmentedTrip("08:10:11", "08:14:11")
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

function arrayIntToArrayShapeDistTraveled(array) {
  return array.map(integer => {
    return { shape_dist_traveled: integer }
  });
}

describe('the function removeDuplicatesInSorted', () => {
  const array = [1, 1, 2, 2, 2, 3, 3, 4, 4];
  const newArray = arrayIntToArrayShapeDistTraveled(array);
  it('should filter duplicates in an array', () => {
    assert.deepEqual(
      removeDuplicatesInSortedShape(newArray), 
      arrayIntToArrayShapeDistTraveled([1, 2, 3, 4])
    );
  })
})
