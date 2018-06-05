# the-rolling-dutchman
Master Project of Nataniel Hofer: Visualizing public transports in Netherlands (GTFS to vector tiles)

work in progress, tries to import schedule of GTFS to vector tiles

## Precision on the expectation of GTFS
Decided to fraction the shapes using shape\_dist\_traveled present in both shapes.txt and stopTimes.txt
For the moment require that the number be exactly the same.
Expects also that the points corresponding to stop_location are repeated twice (otherwise it looses a piece of the shape).

## Import data
* get GTFS from 
* install mongodb 
* launch mongodb (sudo service mongod start --setParameter cursorTimeoutMillis=1800000) (this parameter may be useful)
* import gtfs to mongodb using node-gtfs
* cd modules/ && node --require babel-register main.js
* cd ../../out/
* Use tippecanoe
* tippecanoe --no-tile-size-limit -o gtfs_tiles.mbtiles full.geojson

variant: it is possible to use gtfs-to-geojson to generate a file without the schedule.
It is then possible to use parameters --minimum-zoom= and --maximum-zoom= to generate tiles for specific zoom levels.
Combining this with tile-join it is possible to generates one .mbtiles without schedules for zoom 10-12 and with schedule for zoom 13-14. 
