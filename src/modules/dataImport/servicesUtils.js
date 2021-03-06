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
  const filter = weekDayToFilter(weekDay);
  return gtfs.getCalendars(filter, projection);
}

async function getIdsOfServicesActiveAtMoment(momentInstance) {
  const day = momentInstance.day();
  const weekDay = intToWeekday(day);
  const services = await getServicesActiveOnWeekday(weekDay);
  const servicesActives = services.filter((service) => {
    // margin for the isBetween
    const startDate = moment(service.start_date.toString()).subtract(1, 'seconds');
    const endDate = moment(service.end_date.toString());
    endDate.add(1, 'day');
    // to include the last day
    return momentInstance.isBetween(startDate, endDate);
  });
  const todayString = momentInstance.format('YYYYMMDD');
  const serviceExceptions = await gtfs.getCalendarDates({ date: todayString });
  const servicesIds = servicesActives.map(service => service.service_id);
  serviceExceptions.forEach((service) => {
    if (service.exception_type === 1) {
      servicesIds.push(service.service_id);
    } else if (service.exception_type === 2) {
      const indexToRemove = servicesIds.indexOf(service.service_id);
      if (indexToRemove !== -1) {
        servicesIds.splice(indexToRemove, 1);
      }
    }
  });
  return servicesIds;
}

async function getIdsOfServicesActiveAtStringDate(yyyymmdd) {
  return getIdsOfServicesActiveAtMoment(moment(yyyymmdd, 'YYYYMMDD'));
}

async function getIdsOfServicesActiveAtDay(year, month, day) {
  return getIdsOfServicesActiveAtMoment(moment().year(year).month(month).day(day));
}

async function getIdsOfServicesActiveToday() {
  const momentInstance = moment();
  return getIdsOfServicesActiveAtMoment(momentInstance);
}

export {
  getIdsOfServicesActiveAtDay, getIdsOfServicesActiveAtMoment, getIdsOfServicesActiveToday,
  getIdsOfServicesActiveAtStringDate,
};

