import { Enum } from 'enumify';

const gtfs = require('gtfs');

class Weekday extends Enum {}
Weekday.initEnum([
  'MONDAY', 'TUESDAY', 'WEDNESDAY',
  'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);

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

// TODO write unit tests for this function
function dateStringToDate(stringDate) {
  const year = parseInt(stringDate.toString().substring(0, 4), 10);
  // 0 -> January
  const month = parseInt(stringDate.toString().substring(4, 6), 10) - 1;
  const day = parseInt(stringDate.toString().substring(6, 8), 10);
  return new Date(year, month, day);
}

exports.getServicesActiveToday = async () => {
  const date = new Date(Date.now());
  const day = date.getDay();
  const weekDay = intToWeekday(day);
  const services = await getServicesActiveOnWeekday(weekDay);
  return services.filter((service) => {
    const start_date = dateStringToDate(service.start_date);
    const end_date = dateStringToDate(service.end_date);
    // to include the last day (date library is total bs)
    end_date.setDate(end_date.getDate() + 1);
    return date >= start_date && date <= end_date;
  });
};
