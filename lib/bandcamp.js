var pry = require('pryjs');
var bandcamp = require('bandcamp-scraper');
var bandcampRegex = /(bandcamp)|(listen)/;
var dateFormat = require('dateformat');
var inflector = require('inflected');
var util = require('util');

var getAlbumInfo = util.promisify(bandcamp.getAlbumInfo);

function extractInfo(res) {
  return {
    artist: inflector.titleize(res.artist),
    title: inflector.titleize(res.raw.current.title),
    releaseDate: dateFormat(res.raw.album_release_date, 'mm/dd/yyyy'),
    id: res.raw.id,
    type: res.raw.item_type
  };
}

exports.findInfo = async(bandcampUrl) => {
  if (!bandcampUrl) {
    throw Error(`bandcamp: bandcampUrl is ${bandcampUrl}`);
  }

  if (!bandcampUrl.match(bandcampRegex)) {
    throw Error(`bandcamp: ${bandcampUrl} is not a Bandcamp URL`);
  }

  var res = await getAlbumInfo(bandcampUrl);

  return {
    ...extractInfo(res),
    bandcampUrl: bandcampUrl
  };
};
