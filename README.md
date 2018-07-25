# the-rolling-dutchman
Master Project of Nataniel Hofer: Visualizing public transports in Netherlands (GTFS to vector tiles)

## Precision on the expectation of GTFS
The shapes.txt file is optional in GTFS. It is required here in order to work properly.
To facilitate tiling, the shapes are fractioned between stops.
Currently two ways of fractioning the shapes are supported:
* The first way is to have a field *shape\_dist\_traveled* in stop\_times.txt and in shapes.txt. The *shape\_dist\_traveled* value in stop\_times must exists in the shapes.txt for the corresponding trip.
* A second way, if there is no filed *shape\_dist\_traveled*, is to have the *shape\_pt\_sequence* in shapes.txt prefixed by the *stop\_sequence* in stop_times.txt:
E.g. shapes going from stop A (*stop_sequence 1*) to stop B (*stop\_sequence 2*) must have their field *shape_pt_sequence* starting by "1".

## GTFS data

### Vienna dataset
Download from [here](https://transitfeeds.com/p/stadt-wien/888/20180119/download) and save to `data/Wien/gtfs.zip`.

### Netherlands dataset

Download from [here]https://transitfeeds.com/p/ov/814/latest) and save to `data/Netherlands/gtfs.zip`.

### Tadao dataset
Tadao is under a NDA. For CampToCamp users save to `data/Tadao/GTFS_Hiver_au_03-09-2018.zip`

## GTFS to GeoJSON conversion

### Import into mongodb
Run mongodb:

```
docker run -p 27017:27017 -v $PWD/data/mongodb:/data/db -d mongo:3.6.6-jessie --setParameter cursorTimeoutMillis=1800000
```

Import into mongodb, e.g. for Vienna dataset:

```
npm run import configWien/config-Wien.json
```

### Extract GeoJSON files from data in mongodb

The config files here are an extension of the config file for the data import in mongodb (See configNetherlands/config-Netherlands.json for an example)
* ```node node node_modules/gtfs-to-geojson/bin/gtfs-to-geojson.js --configPath PATH\_TO\_CONFIG\_FILE  --skipImport```
Will get the shapes to directory geojson -> does not contain the schedule. It is important to specify --skipImport to gain time.
* ```npm run getStops PATH\_TO\_CONFIG\_FILE```
Will get the stops to a geojson file
* ```npm run getSchedule PATH\_TO\_CONFIG\_FILE```
Will get the shapes with the schedules in a geojson file

### Merge GeoJSON

The scripts getStops and getSchedule export the geojson in multiple batchs to gain time, use the following command to merge them back in one file: 
* ```node_modules/\@mapbox/geojson-merge/geojson-merge  $PATH\_TO\_FILES > OUTPUT\_FILE```

## Generate vector tiles

### Parameters Used

We use [tippecanoe](https://github.com/mapbox/tippecanoe) to generate tiles. Tippecanoe allows great control over the tile generation. Here is an overview of the important parameters.
* -o outputFile : generate a .mbtiles file
* -f : use to overwrite the outputFile
* --minmium-zoom, --maximum-zoom : parameters used to control the range of zoom of the tile generation. Must be tuned according to the data, to avoid pointless large files.
* -l layername : Must correspond to the layerName in the mapbox-style file
* -pk : use to avoid limitsize of 500 KB per tile
* -pc : use to avoid clipping of the features (currently necessary for the schedule to work properly but increases the size of the tiles for lower zooms)

### Examples

See or run `./configWien/generate_tiles`

## Run the web application

* ```npm start```

To switch between dataset, change the value of alias in `configWeb.json` to the path of another config file