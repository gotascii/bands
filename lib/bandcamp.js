var bandcamp = require('bandcamp-scraper');
var dateFormat = require('dateformat');
var inflector = require('inflected');
var util = require('util');

var getAlbumInfo = util.promisify(bandcamp.getAlbumInfo);

function extractInfo(res) {
  return {
    artist: inflector.titleize(res.artist),
    title: inflector.titleize(res.raw.current.title),
    releaseDate: dateFormat(res.raw.album_release_date, "mm/dd/yyyy"),
  };
}

exports.findInfo = async (bandcampUrl) => {
  var res = await getAlbumInfo(bandcampUrl);
  return {
    ...extractInfo(res),
    bandcampUrl: bandcampUrl
  };
}