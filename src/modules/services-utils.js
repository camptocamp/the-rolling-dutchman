const gtfs = require('gtfs');

const WEEKDAYS = Object.freeze({
  SUNDAY: Symbol('sunday'),
  MONDAY: Symbol('monday'),
  TUESDAY: Symbol('tuesday'),
  WEDNESDAY: Symbol('wednesday'),
  THURSDAY: Symbol('thursdays'),
  FRIDAY: Symbol('friday'),
  SATURDAY: Symbol('saturday'),
});

function intToWeekday(integer) {
  switch (integer) {
    case 0:
      return WEEKDAYS.SUNDAY;
    case 1:
      return WEEKDAYS.MONDAY;
    case 2:
      return WEEKDAYS.TUESDAY;
    case 3:
      return WEEKDAYS.WEDNESDAY;
    case 4:
      return WEEKDAYS.THURSDAY;
    case 5:
      return WEEKDAYS.FRIDAY;
    case 6:
      return WEEKDAYS.SATURDAY;
    default:
      throw Error(`expected value between 0 and 6 but is: ${String(integer)}`);
  }
}

function weekDayToFilter(weekDay) {
  const returnObject = {};
  switch (weekDay) {
    case WEEKDAYS.MONDAY:
      Object.assign(returnObject, { monday: 1 });
      break;
    case WEEKDAYS.TUESDAY:
      Object.assign(returnObject, { tuesday: 1 });
      break;
    case WEEKDAYS.WEDNESDAY:
      Object.assign(returnObject, { wednesday: 1 });
      break;
    case WEEKDAYS.THURSDAY:
      Object.assign(returnObject, { thursday: 1 });
      break;
    case WEEKDAYS.FRIDAY:
      Object.assign(returnObject, { friday: 1 });
      break;
    case WEEKDAYS.SATURDAY:
      Object.assign(returnObject, { saturday: 1 });
      break;
    case WEEKDAYS.SUNDAY:
      Object.assign(returnObject, { sunday: 1 });
      break;
    default:
      throw Error(`weekday expected but: ${weekDay } received`);
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
  const year = parseInt(stringDate.toString().substring(0, 4));
  // 0 -> January
  const month = parseInt(stringDate.toString().substring(4, 6)) - 1;
  const day = parseInt(stringDate.toString().substring(6, 8));
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
