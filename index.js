#!/usr/bin/env node

require('dotenv').config();

const bandcamp = require('./bandcamp');
const discogs = require('./discogs');
const logger = require('./logger');
const metalArchives = require('./metalArchives')

async function log() {
  info = await bandcamp.findInfo();
  params = {
    artist: info.artist,
    title: info.title
  };
  info.label = await metalArchives.findLabel(params);
  info.label ||= await discogs.findLabel(params);
  logger.log(info);
}

log();