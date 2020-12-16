const axios = require('axios');
const htmlParser = require('node-html-parser');
const querystring = require('querystring');

const albumSearchUrl = 'https://www.metal-archives.com/search/ajax-advanced/searching/albums/?';

function getAlbumSearch(artist, title) {
  var params = {
    bandName: artist,
    exactBandMatch: 1,
    releaseTitle: title,
    exactReleaseMatch: 1,
    sEcho: 1,
    iColumns: 2,
    iDisplayStart: 0,
    iDisplayLength: 200,
    mDataProp_0: 0,
    mDataProp_1: 1
  };
  var encodedParams = `${querystring.encode(params)}&releaseType[]=1&releaseType[]=3`;

  return axios.get(`${albumSearchUrl}${encodedParams}`);
}

function extractAlbumUrl(res) {
  var albumSearchResults = res.data.aaData;
  if (albumSearchResults.length >= 1) {
    var albumLink = htmlParser.parse(albumSearchResults[0][1]);
    return albumLink.querySelector('a').getAttribute('href');
  }
}

function extractLabel(res) {
  var albumResponse = htmlParser.parse(res.data);
  for (let elem of albumResponse.querySelectorAll('a')) {
    var href = elem.getAttribute('href');
    if (href && href.includes('labels')) {
      return elem.text;
    }
  }
}

exports.findLabel = async ({ artist, title }) => {
  var res = await getAlbumSearch(artist, title);
  var url = extractAlbumUrl(res);
  if (!url) { return; }
  var res = await axios.get(url);
  return extractLabel(res);
}