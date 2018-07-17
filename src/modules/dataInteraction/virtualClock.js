import { addMilliseconds, getMinutes, getHours, format, differenceInMilliseconds, setHours, setMinutes } from 'date-fns';
import $ from 'jquery';

function minutesSinceBeginOfDay(date) {
  return getMinutes(date) + (60 * getHours(date));
}

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
    $('#pause-button').on('click', () => this.pause());
    $('#play-button').on('click', () => this.play());
    document.getElementById('slider').addEventListener('input', e => this.receiveSliderInput(e.target.value));
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
  }
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
  receiveSliderInput(value) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    this.setCorrespondingDate(setHours(setMinutes(new Date(), minutes), hours));
  }
  getCorrespondingDate() {
    return addMilliseconds(new Date(this.beginDate), this.time - this.beginTime);
  }
  setCorrespondingDate(date) {
    const millisecondsPassed = differenceInMilliseconds(date, this.beginDate);
    this.lastTimeStamp = performance.now();
    this.time = this.beginTime + millisecondsPassed;
  }
}


export default VirtualClock;
