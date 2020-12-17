#!/usr/bin/env node

var argParser = require('minimist');
var argv = argParser(process.argv.slice(2), {
  alias: { e: 'env', i: 'id', s: 'site' }
});

var envOpts = {};
if (argv.env) { envOpts.path = `${argv.env}/.env`; }
require('dotenv').config(envOpts);

var bands = require('./lib/bands');
var bandcampUrl = argv._[0];
if (bandcampUrl) {
  bands.generateCsv(bandcampUrl);
}

var site = require('./lib/site');
var siteDirPath = argv.site || '.';
var spreadsheetId = argv.id || process.env.GOOGLE_SSID;
if (spreadsheetId) {
  site.generate(siteDirPath, spreadsheetId);
}
