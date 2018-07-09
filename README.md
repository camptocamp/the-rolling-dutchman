# the-rolling-dutchman
Master Project of Nataniel Hofer: Visualizing public transports in Netherlands (GTFS to vector tiles)

work in progress, tries to import schedule of GTFS to vector tiles

## Precision on the expectation of GTFS
Decided to fraction the shapes using shape\_dist\_traveled present in both shapes.txt and stopTimes.txt
For the moment require that the number be exactly the same.
Expects also that the points corresponding to stop_location are repeated twice (otherwise it looses a piece of the shape).

## Import data in mongodb
* get GTFS from 
* install mongodb 
* launch mongodb (sudo service mongod start --setParameter cursorTimeoutMillis=1800000) (this parameter may be useful)
* import gtfs to mongodb using node-gtfs

## Export GeoJSON files from database

* ```node node node_modules/gtfs-to-geojson/bin/gtfs-to-geojson.js PATH\_TO\_CONFIG\_FILE```
Will get the shapes to directory geojson -> does not contain the schedule
* ```npm run getStops PATH\_TO\_CONFIG\_FILE```
Will get the stops to a geojson file
* ```npm run getSchedule PATH\_TO\_CONFIG\_FILE```
Will get the shapes with the schedules in a geojson file

Standards config files are located in directories Netherlands/ and Wien/
## merge geojson and generate tiles

* ```npm run mergeGeoJSON $PATH\_TO\_FILES > OUTPUT\_FILE```
* Use tippecanoe to generate tiles
* tippecanoe -o stops.mbtiles -l stops --minimum-zoom=9 --maximum-zoom=16 combined.geojson
* tippecanoe -o schedule.mbtiles -l schedule --minimum-zoom=12 --maximum-zoom=16 CompleteSchedule.geojson
* tippecanoe -o withoutSchedule.mbtiles -l Netherlands_gtfs --minimum-zoom=5 --maximum-zoom=11 geojson/Netherlands_gtfs.geojso
* tile-join -o merged.mbtiles stops.mbtiles schedule.mbtiles withoutSchedule.mbtiles
It is then possible to use parameters --minimum-zoom= and --maximum-zoom= to generate tiles for specific zoom levels.
Combining this with tile-join it is possible to generates one .mbtiles without schedules for zoom 10-12 and with schedule for zoom 13-14. 
