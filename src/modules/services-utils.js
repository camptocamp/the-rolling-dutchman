const gtfs = require('gtfs');

const AGENCY_KEY = 'Wien_gtfs';
const queryWithAgencyKey = Object.freeze({
  agency_key : AGENCY_KEY
});

const WEEKDAYS = Object.freeze({
  SUNDAY : Symbol("sunday"),
  MONDAY : Symbol("monday"),
  TUESDAY : Symbol("tuesday"),
  WEDNESDAY : Symbol("wednesday"),
  THURSDAY : Symbol("thursdays"),
  FRIDAY : Symbol("friday"),
  SATURDAY : Symbol("saturday")
});

function intToWeekday(integer){
  switch (integer){
    case 0:
      return SUNDAY;
    case 1:
      return MONDAY;
    case 2: 
      return TUESDAY;
    case 3:
      return WEDNESDAY;
    case 4:
      return THURSDAY;
    case 5:
      return FRIDAY;
    case 6:
      return SATURDAY;
    default:
      throw Error('expected value between 0 and 6 but is: ' + String(integer));
  }
}

function weekDayToFilter(weekDay){
  const returnObject = {};
  switch (weekDay) {
    case MONDAY:
      Object.assign(returnObject, {monday : 1});
      break;
    case TUESDAY:
      Object.assign(returnObject, {tuesday : 1});
      break;
    case WEDNESDAY:
      Object.assign(returnObject, {wednesday : 1});
      break;
    case THURSDAY:
      Object.assign(returnObject, {thursday : 1});
      break;
    case FRIDAY:
      Object.assign(returnObject, {friday : 1});
      break;
    case SATURDAY:
      Object.assign(returnObject, {saturday : 1});
      break;
    case SUNDAY:
      Object.assign(returnObject, {sunday : 1});
      break;
    default:
      throw Error('weekday expected but: ' + weekDay + ' received');
  }
  return returnObject;
}

async function getServicesActiveOnWeekday(weekDay){
  projection = {
    service_id : 1,
    _id : 0,
    start_date: 1,
    end_date : 1
  }
  return gtfs.getCalendars(weekDayToFilter(weekDay), projection = projection);
}

//TODO write unit tests for this function
function dateStringToDate(stringDate){
  const year = parseInt(stringDate.substring(0,4));
  //0 -> January
  const month = parseInt(stringDate.substring(4,6)) - 1;
  const day = parseInt(stringDate.substring(6, 8));
  return new Date(year, month, day);
}

exports.getServicesActiveToday = async () => {
  const date = Date.now();
  const day = date.getDay();
  const weekDay = intToWeekday(day);
  const services = await gtfs.getServicesActiveOnWeekday(weekDay);
  services.filter(service => {
    const start_date = dateStringToDate(service.start_date);
    const end_date = dateStringToDate(service.end_date);
    //to include the last day
    return date >= start_date && date <= (end_date + 1);
  })
  return services;
}