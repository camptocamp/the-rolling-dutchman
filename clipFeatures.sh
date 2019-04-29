#!/bin/bash
scriptdir="$(dirname "$0")"
cd "$scriptdir"
node --require babel-register ./src/modules/dataImport/clipping.js $1 $2 $3
