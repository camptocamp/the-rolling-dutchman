import * as turf from '@turf/turf';
import SphericalMercator from '@mapbox/sphericalmercator';
import { isNumber } from 'util';

const readline = require('readline');
const fs = require('fs');

function bboxToMatchingRectangle(bbox) {
  return [
    [bbox[0], bbox[1]],
    [bbox[0], bbox[3]],
    [bbox[2], bbox[3]],
    [bbox[2], bbox[1]],
    [bbox[0], bbox[1]],
  ];
}

function bboxToLineString(bbox) {
  return turf.lineString(bboxToMatchingRectangle(bbox));
}

class ClippedFeature {
  constructor(entryCoord, originalFeature, indexOfEntry, tileX, tileY, tileZ) {
    this.entryCoord = entryCoord;
    this.originalFeature = originalFeature;
    this.indexOfEntry = indexOfEntry;
    this.coords = [entryCoord];
    this.tileX = tileX;
    this.tileY = tileY;
    this.tileZ = tileZ;
  }
  addPoint(coord) {
    this.coords.push(coord);
  }
  addExitPoint(coord, indexOfExit) {
    this.indexOfExit = indexOfExit;
    this.addPoint(coord);
  }
  toGeoJSON() {
    if (this.originalFeature.geometry.coordinates.length < 2) {
      fs.appendFileSync('errors.txt', `error at tile ${this.tileZ}/${this.tileX}/${this.tileY}, the originalFeature \
      contained not enough point: ${JSON.stringify(this.originalFeature)}`);
      // return a fake geojson to avoid errors in tippecanoe
      const fakeShape = turf.lineString([[0, 0], [0, 1]]);
      fakeShape.geometry.coordinates = [];
      return fakeShape;
    }
    const geojson = turf.lineString(this.coords);
    Object.assign(geojson.properties, this.originalFeature.properties);
    const shapeLength = turf.length(this.originalFeature);
    const coordsAtEntry = turf.getCoords(this.originalFeature).slice(0, this.indexOfEntry);
    coordsAtEntry.push(this.entryCoord);
    let lengthAtEntry = 0;
    if (coordsAtEntry.length > 1) {
      lengthAtEntry = turf.length(turf.lineString(coordsAtEntry));
    }
    const lengthAtExit = lengthAtEntry + turf.length(geojson);
    geojson.properties.lengthAtEntry = lengthAtEntry;
    geojson.properties.lengthAtExit = lengthAtExit;
    geojson.properties.shapeLength = shapeLength;
    geojson.tippecanoe = this.originalFeature.tippecanoe;
    return geojson;
  }
}

function handleSimpleCrossing(
  intersectionPoints, insideBbox, newFeaturesClipped,
  indexOfCoord, originalFeature, x, y, z,
) {
  const coord = turf.getCoord(intersectionPoints.features[0]);
  if (insideBbox) {
    newFeaturesClipped[newFeaturesClipped.length - 1].addExitPoint(coord, indexOfCoord);
  } else {
    newFeaturesClipped.push(new ClippedFeature(coord, originalFeature, indexOfCoord, x, y, z));
  }
}

function handleDoubleCrossing(
  intersectionPoints, newFeaturesClipped,
  indexOfCoord, originalFeature, x, y, z,
) {
  const coordEntry = turf.getCoord(intersectionPoints.features[0]);
  const coordExit = turf.getCoord(intersectionPoints.features[1]);
  const clippedFeature = new ClippedFeature(coordEntry, originalFeature, indexOfCoord, x, y, z);
  clippedFeature.addExitPoint(coordExit, indexOfCoord);
  newFeaturesClipped.push(clippedFeature);
}

function clipLineStringToBbox(originalFeature, bbox, x, y, z) {
  const coords = turf.getCoords(originalFeature);
  const newFeaturesClipped = [];
  bbox.forEach((element) => {
    if (!isNumber(element)) {
      throw Error(`bbox must only contains number but it contains: ${element}`);
    }
  });
  const bboxPolygon = turf.bboxPolygon(bbox);
  const bboxLineString = bboxToLineString(bbox);
  const firstPoint = turf.point(coords[0]);
  let insideBbox = turf.booleanContains(bboxPolygon, firstPoint);
  if (insideBbox) {
    newFeaturesClipped.push(new ClippedFeature(coords[0], originalFeature, 0, x, y, z));
  }
  for (let index = 1; index < coords.length; index += 1) {
    const currentLine = turf.lineString([coords[index - 1], coords[index]]);
    if (turf.booleanCrosses(currentLine, bboxPolygon)) {
      const intersectionPoints = turf.lineIntersect(currentLine, bboxLineString);
      switch (intersectionPoints.features.length) {
        case 0:
          throw Error('at least one intersection Point is expected if a lineString crosses the bboxPolygon');
        case 1:
          handleSimpleCrossing(
            intersectionPoints, insideBbox, newFeaturesClipped, index, originalFeature,
            x, y, z,
          );
          insideBbox = !insideBbox;
          break;
        case 2:
          if (insideBbox) {
            throw Error('did not expect a line whose first endpoint is inside a bbox to cross it mutliple times');
          }
          handleDoubleCrossing(
            intersectionPoints, newFeaturesClipped,
            index, originalFeature, x, y, z,
          );
          break;
        default:
          throw Error('a line must cross a bounding box between 0 and 2 times');
      }
    }
    if (insideBbox) {
      newFeaturesClipped[newFeaturesClipped.length - 1].addPoint(coords[index]);
    }
  }
  newFeaturesClipped.forEach((clippedFeature) => {
    if (clippedFeature.coords.length === 1) {
      fs.appendFileSync('bboxes.txt', `x ${x}, y ${y}, z ${z}, bbox ${JSON.stringify(bbox)}`);
    }
  });
  return newFeaturesClipped;
}

function coordsInBbox(coords, merc, x, y, z) {
  const bbox = merc.bbox(x, y, z);
  const line = turf.lineString(coords);
  const bboxLineString = bboxToLineString(bbox);
  return turf.lineIntersect(line, bboxLineString).features.length > 0;
}

function main() {
  const z = parseInt(process.argv[2], 10);
  const x = parseInt(process.argv[3], 10);
  const y = parseInt(process.argv[4], 10);
  const merc = new SphericalMercator({
    size: 512,
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const bbox = merc.bbox(x, y, z);
  rl.on('line', (line) => {
    const geojson = JSON.parse(line);
    // coordinates are empty array when they are not in the bounding box
    // TODO be sure at 100% about this
    if (geojson.geometry.coordinates.length !== 0) {
      fs.appendFileSync('lines.txt', `${line} \n`);
      const clippedFeatures = clipLineStringToBbox(geojson, bbox, x, y, z);
      clippedFeatures.forEach((element) => {
        console.log(JSON.stringify(element.toGeoJSON()));
      });
    }
  });
}


if (typeof require !== 'undefined' && require.main === module) {
  main();
}

export { coordsInBbox };

