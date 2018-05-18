# the-rolling-dutchman
Master Project of Nataniel Hofer: Visualizing public transports in Netherlands (GTFS to vector tiles)

work in progress, tries to import schedule of GTFS to vector tiles

## Precision on the expectation of GTFS
Decided to fraction the shapes using shape\_dist\_traveled present in both shapes.txt and stopTimes.txt
For the moment require that the number be exactly the same.
Expects also that the points corresponding to stop_location are repeated twice (otherwise it looses a piece of the shape).
