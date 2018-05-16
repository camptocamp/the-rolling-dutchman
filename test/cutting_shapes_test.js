/* eslint-disable */
import 'babel-polyfill'
import {makeKey, createFragmentsForStopTimes, FractionedShapeDict, FragmentedTrip} from '../src/modules/cutting_shapes';
const assert = require('assert');

describe('make key', () => {
  it('should return correct string key from 2 integers', () => {
    assert.equal(makeKey(2, 3), ('23'));
  });
});

function mockUpStopTime(departure_time, arrival_time, shape_dist_traveled) {
  return {
    departure_time,
    arrival_time,
    arrival_time,
    shape_dist_traveled,
  };
}

//TODO finish this
describe('createFragmentsForStopTimes', () => {
  const shapeDict1 = new FractionedShapeDict();
  const shapeDict2 = new FractionedShapeDict();
  const hour1 = '08:11:00';
  const hour2 = '08:13:00';
  const hour3 = '12:15:00';
  const unusedHour = 'unusedhour';
  const stopTimes1 = [mockUpStopTime(hour1, unusedHour, 0),
    mockUpStopTime(hour2, hour2, 1), mockUpStopTime(unusedHour, hour3, 3)];
  const stopTimes2 = [mockUpStopTime(hour1, unusedHour, 0), mockUpStopTime(unusedHour, hour2, 3)];
  const shapeDist = [0, 1, 3];
  const firstResult = {"01": [{startTime: hour1, endTime: hour2}], "12": [{startTime: hour2, endTime: hour3}]};
  const secondResult = {"02": [{startTime: hour1, endTime: hour2}]};
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
  const fractionedShapeDict = new FractionedShapeDict();
  const trip1 =  new FragmentedTrip("08:10:11", "08:12:11")
  const trip2 =  new FragmentedTrip("08:10:11", "08:14:11")
  const key = "04";
  it('should add a simpleTrip correctly', () => {
    fractionedShapeDict.addTrip(key, trip1);
    assert.equal(fractionedShapeDict.innerDictionary[key][0], trip1)
  })
  it('should append if an existing trip exist', () => {
    fractionedShapeDict.addTrip(key, trip2);
    assert.equal(fractionedShapeDict.innerDictionary[key].length, 2)
  })
})
