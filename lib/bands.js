require('dotenv').config();

var bandcamp = require('./bandcamp');
var discogs = require('./discogs');
var logger = require('./logger');
var metalArchives = require('./metalArchives')

exports.generateCsv = async (bandcampUrl) => {
  info = await bandcamp.findInfo(bandcampUrl);
  params = {
    artist: info.artist,
    title: info.title
  };
  info.label = await metalArchives.findLabel(params);
  info.label ||= await discogs.findLabel(params);
  logger.log(info);
}