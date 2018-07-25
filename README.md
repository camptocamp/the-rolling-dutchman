# the-rolling-dutchman
Master Project of Nataniel Hofer: Visualizing public transports in Netherlands (GTFS to vector tiles)

## Precision on the expectation of GTFS
Decided to fraction the shapes using shape\_dist\_traveled present in both shapes.txt and stopTimes.txt
For the moment require that the number be exactly the same.
Expects also that the points corresponding to stop_location are repeated twice (otherwise it looses a piece of the shape).

## GTFS data

### Vienna dataset
Download from [here](https://transitfeeds.com/p/stadt-wien/888/20180119/download) and save to `data/Wien/gtfs.zip`.

## GTFS to GeoJSON conversion

### Import into mongodb
Run mongodb:

```
docker run -p 27017:27017 -v $PWD/data/mongodb:/data/db -d mongo:3.6.6-jessie --setParameter cursorTimeoutMillis=1800000
```

Import into mongodb, e.g. for Vienna dataset:

```
npm run import configWien/config-import-schedule.json
```

### Extract GeoJSON files from data in mongodb

* Extract GeoJSON files of all stops: `npm run getStops PATH_TO_CONFIG_FILE`
* Extract GeoJSON files of schedules: `npm run getSchedule PATH_TO_CONFIG_FILE`

Sample config files are located in the `Netherlands/` and `Wien/` directories.

### Merge GeoJSON

```
npm run mergeGeoJSON PATH_TO_FILES > OUTPUT_FILE
```
@TODO pipe adds random noise

## Generate vector tiles

Use tippecanoe to generate tiles
* `tippecanoe -o stops.mbtiles -l stops --minimum-zoom=9 --maximum-zoom=16 stops.geojson`
* `tippecanoe -o schedule.mbtiles -l schedule --minimum-zoom=12 --maximum-zoom=16 --no-tile-size-limit --no-clipping schedule.geojson`
* `tippecanoe -o withoutSchedule.mbtiles -l Netherlands_gtfs --minimum-zoom=5 --maximum-zoom=11 geojson/Netherlands_gtfs.geojso`
* `tile-join --no-tile-size-limit -o merged.mbtiles stops.mbtiles schedule.mbtiles withoutSchedule.mbtiles`
It is then possible to use parameters `--minimum-zoom=` and `--maximum-zoom=` to generate tiles for specific zoom levels.
Combining this with tile-join it is possible to generates one .mbtiles without schedules for zoom 10-12 and with schedule for zoom 13-14.
