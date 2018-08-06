import * as turf from '@turf/turf';
import SphericalMercator from '@mapbox/sphericalmercator';

const merc = new SphericalMercator({ size: 512 });

function tileToBbox(x, y, z) {
  return merc.bbox(x, y, z);
}

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
    const geojson = turf.lineString(this.coords);
    Object.assign(geojson.properties, this.originalFeature.properties);
    const shapeLength = turf.length(this.originalFeature);
    const coordsAtEntry = turf.getCoords(this.originalFeature).slice(0, this.indexOfEntry).push(this.entryCoord);
    const lengthAtEntry = turf.length(turf.lineString(coordsAtEntry));
    const lengthAtExit = lengthAtEntry + turf.length(geojson);
    geojson.properties.lengthAtEntry = lengthAtEntry;
    geojson.properties.lengthAtExit = lengthAtExit;
    geojson.properties.shapeLength = shapeLength;
    return geojson;
  }
}

function handleSimpleCrossing(intersectionPoints, insideBbox, newFeaturesClipped, indexOfCoord) {
  const coord = turf.getCoord(intersectionPoints.features[0]);
  if (insideBbox) {
    newFeaturesClipped[newFeaturesClipped.length - 1].addExitPoint(coord, indexOfCoord);
  } else {
    newFeaturesClipped.push(new ClippedFeature(coord, indexOfCoord));
  }
}

function handleDoubleCrossing(intersectionPoints, newFeaturesClipped, indexOfCoord) {
  const coordEntry = turf.getCoord(intersectionPoints.features[0]);
  const coordExit = turf.getCoord(intersectionPoints.features[1]);
  const clippedFeature = new ClippedFeature(coordEntry, indexOfCoord);
  clippedFeature.addExitPoint(coordExit, indexOfCoord);
  newFeaturesClipped.push(clippedFeature);
}

function clipLineStringToBbox(geojson, bbox) {
  const coords = turf.getCoords(geojson);
  const newFeaturesClipped = [];
  const bboxPolygon = turf.bboxPolygon(bbox);
  const bboxLineString = bboxToLineString(bbox);
  const firstPoint = turf.point(coords[0]);
  let insideBbox = turf.booleanContains(bboxPolygon, firstPoint);
  if (insideBbox) {
    newFeaturesClipped.push(new ClippedFeature(coords[0], geojson, 0));
  }
  for (let index = 1; index < coords.length; index += 1) {
    const currentLine = turf.lineString([coords[index - 1], coords[index]]);
    if (turf.booleanCrosses(currentLine, bboxPolygon)) {
      const intersectionPoints = turf.lineIntersect(currentLine, bboxLineString);
      switch (intersectionPoints.features.length) {
        case 0:
          throw Error('at least one intersection Point is expected if a lineString crosses the bboxPolygon');
        case 1:
          handleSimpleCrossing(intersectionPoints, insideBbox, newFeaturesClipped, index);
          insideBbox = !insideBbox;
          break;
        case 2:
          if (insideBbox) {
            throw Error('did not expect a line whose first endpoint is inside a bbox to cross it mutliple times');
          }
          handleDoubleCrossing(intersectionPoints, newFeaturesClipped, index);
          break;
        default:
          throw Error('a line must cross a bounding box between 0 and 2 times');
      }
    }
    if (insideBbox) {
      newFeaturesClipped[newFeaturesClipped.length - 1].addPoint(coords[index]);
    }
  }
  return newFeaturesClipped;
}

function main() {
  console.log('hello');
  const bbox = tileToBbox(1, 1, 2);
  const pt = turf.point([10, 0], {});
  const line = turf.lineString([[-180, 0]]);
  const bboxLineString = bboxToLineString(bbox);
  // const interesectLines = turf.lineIntersect(line, bboxLineString);

  console.log(`${pt}`);
}

main();
