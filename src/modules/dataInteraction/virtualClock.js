import { addMilliseconds } from 'date-fns';

class VirtualClock {
  constructor() {
    this.init();
  }
  init() {
    this.speed = 1;
    this.beginDate = new Date();
    this.time = performance.now();
    this.beginTime = this.time;
    this.lastTimeStamp = performance.now();
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
    const diff = timeStamp - this.lastTimeStamp;
    this.lastTimeStamp = timeStamp;
    this.time += diff * this.speed;
  }
  getCorrespondingDate() {
    return addMilliseconds(new Date(this.beginDate()), this.time - this.beginTime);
  }
}

export default VirtualClock;
