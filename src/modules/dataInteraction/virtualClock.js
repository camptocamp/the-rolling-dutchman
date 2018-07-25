import {
  addMilliseconds,
  getMinutes,
  getHours,
  format,
  differenceInMilliseconds,
  setHours,
  setMinutes,
} from 'date-fns';
import $ from 'jquery';

function minutesSinceBeginOfDay(date) {
  return getMinutes(date) + (60 * getHours(date));
}

function removeTokenAtTheEnd(string, token) {
  if (string.indexOf(token) === string.length - 1) {
    return string.substring(0, string.length - 1);
  }
  return string;
}
function isNumeric(n) {
  return !Number.isNaN(parseFloat(n)) && Number.isFinite(parseFloat(n));
}

const SPEED_ARRAY = [-60, -30, -10, -5, -4, -2, -1, -0.5, 0.5, 1, 2, 4, 5, 10, 30, 60];

/**
 * Allows to control time in bus animation
 * control the user input over the buttons and reacts accordingly
 */
class VirtualClock {
  constructor() {
    this.init();
  }
  init() {
    this.isPaused = false;
    this.speed = 1;
    this.beginDate = new Date();
    this.time = performance.now();
    this.beginTime = this.time;
    this.lastTimeStamp = performance.now();
    $('#speed-up').on('click', () => this.speedUp());
    $('#speed-down').on('click', () => this.speedDown());
    $('#pause-button').on('click', () => this.pause());
    $('#play-button').on('click', () => this.play());
    $('#slider').on('input', e => this.receiveTimeSliderInput(e.target.value));
    $('#speed-number').on('blur', e => this.receiveSpeedInput(e.target.value));
  }
  pause() {
    this.isPaused = true;
  }
  play() {
    this.isPaused = false;
  }
  getTime() {
    return this.time;
  }
  getSpeed() {
    return this.speed;
  }
  setSpeed(speed) {
    this.speed = speed;
    $('#speed-number').val(`${speed}x`);
  }
  /**
   * Update the time according to the speed
   * @param {timeStamp given by the browser} timeStamp
   */
  updateTime(timeStamp) {
    if (!this.isPaused) {
      const diff = timeStamp - this.lastTimeStamp;
      this.time += diff * this.speed;
    }
    this.lastTimeStamp = timeStamp;
  }
  updateSlider() {
    const correspondingDate = this.getCorrespondingDate();
    const value = minutesSinceBeginOfDay(correspondingDate);
    $('#slider-value').text(format(correspondingDate, 'HH:mm:ss'));
    $('#slider').val(value);
  }
  receiveTimeSliderInput(value) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    this.setCorrespondingDate(setHours(setMinutes(new Date(), minutes), hours));
  }
  receiveSpeedInput(value) {
    const number = removeTokenAtTheEnd(value, 'x');
    if (isNumeric(number)) {
      this.setSpeed(parseFloat(number));
    }
  }
  getCorrespondingDate() {
    return addMilliseconds(new Date(this.beginDate), this.time - this.beginTime);
  }
  setCorrespondingDate(date) {
    const millisecondsPassed = differenceInMilliseconds(date, this.beginDate);
    this.lastTimeStamp = performance.now();
    this.time = this.beginTime + millisecondsPassed;
  }
  speedDown() {
    let index = SPEED_ARRAY.findIndex(element => element >= this.speed);
    if (index === -1) {
      index = SPEED_ARRAY.length - 1;
    } else {
      index -= 1;
    }
    if (index >= 0) {
      this.setSpeed(SPEED_ARRAY[index]);
    }
  }
  speedUp() {
    let index = SPEED_ARRAY.findIndex(element => element > this.speed);
    if (index === -1) {
      index = SPEED_ARRAY.length - 1;
    }
    this.setSpeed(SPEED_ARRAY[index]);
  }
}


export default VirtualClock;
