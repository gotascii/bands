const argParser = require('minimist');
const bandcamp = require('bandcamp-scraper');
const dateFormat = require('dateformat');
const inflector = require('inflected');
const util = require('util');

const argv = argParser(process.argv.slice(2));
const bandcampUrl = argv.l;

const getAlbumInfo = util.promisify(bandcamp.getAlbumInfo);

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