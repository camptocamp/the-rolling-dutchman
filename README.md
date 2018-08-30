# the-rolling-dutchman
Master Project of Nataniel Hofer: Visualizing public transports (GTFS to vector tiles)

## Precision on the expectation of GTFS
The shapes.txt file is optional in GTFS. It is required here in order to work properly.
To facilitate tiling, the shapes are fractioned between stops.
Currently two ways of fractioning the shapes are supported:
* The first way is to have a field *shape\_dist\_traveled* in stop\_times.txt and in shapes.txt. The *shape\_dist\_traveled* value in stop\_times must exists in the shapes.txt for the corresponding trip.
* A second way, if there is no filed *shape\_dist\_traveled*, is to have the *shape\_pt\_sequence* in shapes.txt prefixed by the *stop\_sequence* in stop_times.txt:
E.g. shapes going from stop A (*stop_sequence 1*) to stop B (*stop\_sequence 2*) must have their field *shape_pt_sequence* starting by "1".

# INSTALL

## Installation

* install docker, nodejs version at least 8 (for async await support)
* install tippecanoe
  - `git clone git@github.com:mapbox/tippecanoe.git`
  - `cd tippecanoe`
  - `make -j`
  - `sudo make install`
* `git clone git@github.com:camptocamp/the-rolling-dutchman.git`
* cd the-rolling-dutchman
* npm install (could take a long time)

## GTFS data


The `data` folder is in the .gitignore, you must create it and its subfolders. Place all the GTFS data in this folder.

### Vienna dataset
Download from [here](https://transitfeeds.com/p/stadt-wien/888/20180119/download) and save to `data/Wien/gtfs.zip`.

### Netherlands dataset

Download from [here](https://transitfeeds.com/p/ov/814/latest) and save to `data/Netherlands/gtfs.zip`.

### Tadao dataset
Tadao is under a NDA. For CampToCamp users save to `data/Tadao/GTFS_Hiver_au_03-09-2018.zip`

## Data import
The pipeline is the following GTFS -> mongodb -> GeoJSON -> vector tiles. The following sections explain in details what must be done for each step.



## GTFS -> mongodb

### Dockerized mongodb
* Run mongodb:

```
docker run -p 27017:27017 -v $PWD/data/mongodb:/data/db -d mongo:3.6.6-jessie --setParameter cursorTimeoutMillis=1800000
```
* `npm run import PATH_TO_YOUR_CONFIG_FILE`

In practice, there was some issues when the computer was restarted. I had to import in mongodb again (error message: use of closed session is not allowed).
Never encountered the issue with the non-dockerized version

### Non-dockerized mongodb

* Follow the steps from https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/ to install mongodb
* Run mongodb: `sudo service mongod start`
* `npm run import PATH_TO_YOUR_CONFIG_FILE`

## mongodb -> GeoJSON

The config files here are an extension of the config file for the data import in mongodb (See configNetherlands/config-Netherlands.json for an example)

* ```node node node_modules/gtfs-to-geojson/bin/gtfs-to-geojson.js --configPath PATH_TO_CONFIG_FILE  --skipImport```
Will get the shapes to directory geojson -> does not contain the schedule. It is important to specify --skipImport to gain time.
* ```npm run getStops PATH_TO_CONFIG_FILE``` :
Will get the stops to a geojson file
* ```npm run getSchedule PATH_TO_CONFIG_FILE``` :
Will get the shapes with the schedules in a geojson file


### Merge GeoJSON

The scripts getStops and getSchedule export the geojson in multiple batchs to gain time, use the following command to merge them back in one file: 
* ```node node_modules/\@mapbox/geojson-merge/geojson-merge  PATH_TO_FILES > OUTPUT_FILE```

## GeoJSON -> vector tiles

### Parameters Used

We use [tippecanoe](https://github.com/mapbox/tippecanoe) to generate tiles. Tippecanoe allows great control over the tile generation. Here is an overview of the important parameters.
* -o outputFile : generate a .mbtiles file
* -f : use to overwrite the outputFile
* --minmium-zoom, --maximum-zoom : parameters used to control the range of zoom of the tile generation. Must be tuned according to the data, to avoid pointless large files.
* -l layername : Must correspond to the layerName in the mapbox-style file
* --no-tile-size-limit : use to avoid limitsize of 500 KB per tile
* --no-clipping : use to avoid clipping of the features (currently necessary for the schedule to work properly but increases the size of the tiles for lower zooms)

### Examples

See or run `./configWien/generate_tiles`  
replace configWien by configNetherlands or configTadao depending on the dataset you want to use

## Launch the application

### Serve the tiles using tileserver-gl

`docker run --rm -it -v $(pwd):/data -p 8080:80 klokantech/tileserver-gl merged.mbtiles`

### Launching the application

To switch between dataset, change the value of alias in `configWeb.json` to the path of another config file.
(e.g change field alias of config.json to configWebTadao.json).

* `npm start`
 
Go to localhost:8000



### Small precisions on config files

There are two types of config files, both are json. Config files of the first types are in folders configNAME\_OF\_DATASET, they are used in the pipeline of the tile generation.
The second type are at the root of the project and contains the substring 'Web'. They are used to select an initial zoom level and center for the map as well as a specific mapbox-style file.
