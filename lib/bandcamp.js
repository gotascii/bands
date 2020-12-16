var argParser = require('minimist');
var bandcamp = require('bandcamp-scraper');
var dateFormat = require('dateformat');
var inflector = require('inflected');
var util = require('util');

var argv = argParser(process.argv.slice(2));
var bandcampUrl = argv.l;

var getAlbumInfo = util.promisify(bandcamp.getAlbumInfo);

function extractInfo(res) {
  return {
    artist: inflector.titleize(res.artist),
    title: inflector.titleize(res.raw.current.title),
    releaseDate: dateFormat(res.raw.album_release_date, "mm/dd/yyyy"),
    bandcampUrl: bandcampUrl
  };
}

exports.findInfo = async () => {
  var res = await getAlbumInfo(bandcampUrl);
  return extractInfo(res);
}