#!/usr/bin/env node

var argParser = require('minimist');
var bands = require('./lib/bands');

var argv = argParser(process.argv.slice(2));
var bandcampUrl = argv.l;

bands.generateCsv(bandcampUrl);