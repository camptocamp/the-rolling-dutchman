import * as turf from '@turf/turf';
import SphericalMercator from '@mapbox/sphericalmercator';
import { isNumber  } from 'util';

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
  constructor(entryCoord, originalFeature, indexOfEntry) {
    this.entryCoord = entryCoord;
    this.originalFeature = originalFeature;
    this.indexOfEntry = indexOfEntry;
    this.coords = [entryCoord];
  }
  addPoint(coord) {
    this.coords.push(coord);
  }
  addExitPoint(coord, indexOfExit) {
    this.indexOfExit = indexOfExit;
    this.addPoint(coord);
  }
  toGeoJSON() {
    try {
      if (this.coords.length < 2) {
        const fakeShape = turf.lineString(this.originalFeature.geometry.coordinates);
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
    } catch (error) {
      fs.appendFileSync('errors.txt', `coords: ${this.coords}, \
      originalFeaturesCoord: ${this.originalFeature.geometry.coordinates}, error: ${error}`);
      throw Error(`error at shape ${this.originalFeature.properties.parentShapeId}: ${error} `);
    }
  }
}

function handleSimpleCrossing(intersectionPoints, insideBbox, newFeaturesClipped, indexOfCoord, originalFeature) {
  const coord = turf.getCoord(intersectionPoints.features[0]);
  if (insideBbox) {
    newFeaturesClipped[newFeaturesClipped.length - 1].addExitPoint(coord, indexOfCoord);
  } else {
    newFeaturesClipped.push(new ClippedFeature(coord, originalFeature, indexOfCoord));
  }
}

function handleDoubleCrossing(intersectionPoints, newFeaturesClipped, indexOfCoord, originalFeature) {
  const coordEntry = turf.getCoord(intersectionPoints.features[0]);
  const coordExit = turf.getCoord(intersectionPoints.features[1]);
  const clippedFeature = new ClippedFeature(coordEntry, originalFeature, indexOfCoord);
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
    newFeaturesClipped.push(new ClippedFeature(coords[0], originalFeature, 0));
  }
  for (let index = 1; index < coords.length; index += 1) {
    const currentLine = turf.lineString([coords[index - 1], coords[index]]);
    if (turf.booleanCrosses(currentLine, bboxPolygon)) {
      const intersectionPoints = turf.lineIntersect(currentLine, bboxLineString);
      switch (intersectionPoints.features.length) {
        case 0:
          throw Error('at least one intersection Point is expected if a lineString crosses the bboxPolygon');
        case 1:
          handleSimpleCrossing(intersectionPoints, insideBbox, newFeaturesClipped, index, originalFeature);
          insideBbox = !insideBbox;
          break;
        case 2:
          if (insideBbox) {
            throw Error('did not expect a line whose first endpoint is inside a bbox to cross it mutliple times');
          }
          handleDoubleCrossing(intersectionPoints, newFeaturesClipped, index, originalFeature);
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

function unitTest() {
  console.log('hello');
  const merc = new SphericalMercator({
    size: 512,
  });
  let coords;
  coords = [
    [5.672572, 52.027756],
    [5.573459, 52.045932],
    [5.552173, 52.049521],
    [5.420208, 52.052952],
    [5.411861, 52.054259],
    [5.370319, 52.064193],
    [5.362530, 52.065710],
    [5.355277, 52.066159],
    [5.259426, 52.065301],
  ];
  console.log(coordsInBbox(coords, merc, 526, 338, 10));
  coords = [
    [5.110295, 52.090081],
    [5.104008, 52.095697],
    [5.098901, 52.097490],
    [5.089524, 52.103263],
    [5.033433, 52.135793],
    [5.009530, 52.149633],
    [5.001762, 52.153491],
    [4.997556, 52.156361],
    [4.994552, 52.159375],
    [4.992621, 52.162311],
    [4.991484, 52.165430],
    [4.990840, 52.169984],
    [4.991269, 52.174998],
    [5.007577, 52.233871],
    [5.008049, 52.236513],
    [5.008006, 52.240231],
    [5.006676, 52.244580],
    [5.004208, 52.248417],
    [4.976635, 52.279725],
    [4.960155, 52.298402],
    [4.947710, 52.312086],
  ];
  console.log(coordsInBbox(coords, merc, 1053, 674, 11));
  console.log(coordsInBbox(coords, merc, 1053, 673, 11));
  coords = [
    [5.852988, 51.844872],
    [5.859447, 51.857756],
    [5.859876, 51.860062],
    [5.859511, 51.864700],
    [5.855091, 51.917009],
    [5.851915, 51.955202],
    [5.851357, 51.962197],
    [5.852194, 51.966111],
    [5.861335, 51.981061],
    [5.864425, 51.984048],
    [5.868502, 51.985871],
    [5.873759, 51.986730],
    [5.885324, 51.986677],
    [5.900517, 51.985382],
  ];
  console.log(coordsInBbox(coords, merc, 2115, 1355, 12));
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
      fs.appendFileSync('lines.txt', line);
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
