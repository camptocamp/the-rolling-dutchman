import { Enum } from 'enumify';

const gtfs = require('gtfs');
const moment = require('moment');

moment().format();

class Weekday extends Enum {}
Weekday.initEnum([
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY',
  'THURSDAY', 'FRIDAY', 'SATURDAY']);

function intToWeekday(integer) {
  return Weekday.enumValues[integer];
}

function weekDayToFilter(weekDay) {
  const returnObject = {};
  switch (weekDay) {
    case Weekday.MONDAY:
      Object.assign(returnObject, { monday: 1 });
      break;
    case Weekday.TUESDAY:
      Object.assign(returnObject, { tuesday: 1 });
      break;
    case Weekday.WEDNESDAY:
      Object.assign(returnObject, { wednesday: 1 });
      break;
    case Weekday.THURSDAY:
      Object.assign(returnObject, { thursday: 1 });
      break;
    case Weekday.FRIDAY:
      Object.assign(returnObject, { friday: 1 });
      break;
    case Weekday.SATURDAY:
      Object.assign(returnObject, { saturday: 1 });
      break;
    case Weekday.SUNDAY:
      Object.assign(returnObject, { sunday: 1 });
      break;
    default:
      throw Error(`weekday expected but: ${weekDay} received`);
  }
  return returnObject;
}

async function getServicesActiveOnWeekday(weekDay) {
  const projection = {
    service_id: 1,
    _id: 0,
    start_date: 1,
    end_date: 1,
  };
  return gtfs.getCalendars(weekDayToFilter(weekDay), projection);
}

exports.getServicesActiveToday = async () => {
  const date = moment();
  const day = date.day();
  const weekDay = intToWeekday(day);
  const services = await getServicesActiveOnWeekday(weekDay);
  return services.filter((service) => {
    const startDate = moment(service.start_date.toString());
    const endDate = moment(service.end_date.toString());
    endDate.add(1, 'day');
    // to include the last day
    return date.isBetween(startDate, endDate);
  });
};
