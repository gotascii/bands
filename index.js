#!/usr/bin/env node

const dotenv = require('dotenv');
dotenv.config();
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
const { info } = require('console');
const { get } = require('http');

const argv = parseArgs(process.argv.slice(2));
const bandcampUrl = argv.l;
const comments = argv.c;
const genre = argv.g ? inflector.titleize(argv.g) : argv.g;

const getBandcampAlbumInfo = util.promisify(bandcamp.getAlbumInfo);
const metalArchivesAlbumSearchUrl = 'https://www.metal-archives.com/search/ajax-advanced/searching/albums/?';

const DiscogsClientClass = disconnect.Client;
const discogsClient = new DiscogsClientClass({ userToken: process.env.DISCOGS_TOKEN });
const discogsDB = discogsClient.database();

// get, issuing http request
// extract, parsing http response to acquire specific data
//   get
//   extract
// store, putting the data into info, returning updated info

// Bandcamp get/extract/store happens at the top-level, no wrapper function needed
// getBandcampAlbumInfo comes with bandcamp-scraper
// extractBandcampInfo extracts and stores because there is no previous info to update
function extractBandcampInfo(res) {
  return {
    artist: inflector.titleize(res.artist),
    title: inflector.titleize(res.raw.current.title),
    releaseDate: dateFormat(res.raw.album_release_date, "mm/dd/yyyy")
  };
}

// The big goal here is to avoid a global info var
// getMetalArchivesAlbumSearch has to return a result, it loses reference to info!
// getMetalArchivesAlbumSearch has a ref to info, so we could nest the
// extractMetalArchivesAlbumUrl->storeMetalArchivesLabel chain in it,
// but then that method ends up doing a ton of shit, we're trying to retain some SOLID here
function findMetalArchivesLabel(info) {
  return getMetalArchivesAlbumSearch(info)
    .then(extractMetalArchivesAlbumUrl)
    .then(url => storeMetalArchivesLabel(url, info));
}

// gets MetalArchive search results, requires params from info
function getMetalArchivesAlbumSearch(info) {
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

  return axios.get(`${metalArchivesAlbumSearchUrl}${encodedParams}`);
}

// Extracts a specific album url from the search results
function extractMetalArchivesAlbumUrl(res) {
  var albumSearchResults = res.data.aaData;
  if (albumSearchResults.length >= 1) {
    var albumLink = parser.parse(albumSearchResults[0][1]);
    return albumLink.querySelector('a').getAttribute('href');
  }
}

// This forms a nested get/extract/store process
// If we find an album url, we have to get/extract/store the label
function storeMetalArchivesLabel(url, info) {
  if (!url) { return info; }

  // There would normally be a getMetalArchivesAlbum but that's overkill,
  // just use axios.get(url) directly
  // Same with store label, doesn't really need its own function
  // We could also wrap the entire sub-G/E/S process, but not needed
  return axios.get(url)
    .then(extractMetalArchivesLabel)
    .then(label => {
      info.label = label;
      return info;
    });
}

function extractMetalArchivesLabel(res) {
  var albumResponse = parser.parse(res.data);
  for (let elem of albumResponse.querySelectorAll('a')) {
    var href = elem.getAttribute('href');
    if (href && href.includes('labels')) {
      return elem.text;
    }
  }
}

function findDiscogsLabel(info) {
  if (info.label) { return info; }

  return discogsDB.search({
    artist: info.artist,
    release_title: info.title,
    type: 'release'
  })
    .then(extractDiscogsLabel)
    .then(label => {
      info.label = label;
      return info;
    });
}

function extractDiscogsLabel(res) {
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

  return mainLabel;
}

function log(info) {
  var line = `"${info.artist}","${info.title}","${info.label || 'Independent'}",${bandcampUrl},${info.releaseDate}`;
  if (genre) { line = `${genre},` + line; }
  if (comments) { line += `,${comments}`; }

  console.log(line);

  var proc = childProcess.spawn('pbcopy');
  proc.stdin.write(line);
  proc.stdin.end();
}

getBandcampAlbumInfo(bandcampUrl)
  .then(extractBandcampInfo)
  .then(findMetalArchivesLabel)
  .then(findDiscogsLabel)
  .then(log)
  .catch((err) => { console.log(err); })