#!/usr/bin/env node

const axios = require('axios');
const bandcamp = require('bandcamp-scraper');
const dateFormat = require('dateformat');
const disconnect = require('disconnect');
const inflector = require('inflected');
const parseArgs = require('minimist');
const parser = require('node-html-parser');
const childProcess = require('child_process');
const querystring = require('querystring');
const util = require('util');

const argv = parseArgs(process.argv.slice(2));
const bandcampUrl = argv.l;
const comments = argv.c;
const genre = argv.g ? inflector.titleize(argv.g) : argv.g;

const getAlbumInfo = util.promisify(bandcamp.getAlbumInfo);
const metalArchivesAlbumSearchUrl = 'https://www.metal-archives.com/search/ajax-advanced/searching/albums/?';

const DiscogsClientClass = disconnect.Client;
const discogsClient = new DiscogsClientClass({userToken: process.env.DISCOGS_TOKEN});
const discogsDB = discogsClient.database();

function log(info) {
  var line = `"${info.artist}","${info.title}","${info.label || 'Independent'}",${bandcampUrl},${info.releaseDate}`;
  if (genre) { line = `${genre},` + line; }
  if (comments) { line += `,${comments}`; }

  console.log(line);

  var proc = childProcess.spawn('pbcopy');
  proc.stdin.write(line);
  proc.stdin.end();
}

function getBandcampAlbumInfo() {
  return getAlbumInfo(bandcampUrl).
  then((albumInfo) => {
    return {
      artist: inflector.titleize(albumInfo.artist),
      title: inflector.titleize(albumInfo.raw.current.title),
      releaseDate: dateFormat(albumInfo.raw.album_release_date, "mm/dd/yyyy")
    };
  });
}

function getMetalArchivesAlbumURL(info) {
  var params = {
    bandName: info.artist,
    exactBandMatch: 1,
    releaseTitle: info.title,
    exactReleaseMatch: 1,
    sEcho: 1,
    iColumns: 2,
    iDisplayStart: 0,
    iDisplayLength: 200,
    mDataProp_0: 0,
    mDataProp_1: 1
  };
  var encodedParams = `${querystring.encode(params)}&releaseType[]=1&releaseType[]=3`;

  return axios.get(`${metalArchivesAlbumSearchUrl}${encodedParams}`)
  .then((res) => {
    var albumSearchResults = res.data.aaData;
    if (albumSearchResults.length >= 1) {
      var albumLink = parser.parse(albumSearchResults[0][1]);
      info.metalArchivesAlbumUrl = albumLink.querySelector('a').getAttribute('href');
    }
    return info;
  });
}

function getMetalArchivesLabel(info) {
  if (!info.metalArchivesAlbumUrl) { return Promise.resolve(info); }

  return axios.get(info.metalArchivesAlbumUrl)
  .then((res) => {
    var albumResponse = parser.parse(res.data);
    for(let elem of albumResponse.querySelectorAll('a')) {
      var href = elem.getAttribute('href');
      if (href && href.includes('labels')) {
        info.label = elem.text;
        break;
      }
    }
    return(info);
  });
}

function getDiscogsLabel(info) {
  if (info.label) { return Promise.resolve(info); }

  return discogsDB.search({
    artist: info.artist,
    release_title: info.title,
    type: 'release'
  })
  .then((res) => {
    var counts = {};
    var mainLabel;
    var max = 0;

    res.results.forEach((release) => {
      release.label.forEach((label) => {
        counts[label] = counts[label] || 0;
        counts[label] += 1;
        if (counts[label] > max) {
          max = counts[label];
          mainLabel = label;
        }
      });
    });

    info.label = mainLabel;
    return info;
  })
}

getBandcampAlbumInfo()
.then(getMetalArchivesAlbumURL)
.then(getMetalArchivesLabel)
.then(getDiscogsLabel)
.then(log)
.catch((err) => { console.log(err); })
