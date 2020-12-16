#!/usr/bin/env node

const dotenv = require('dotenv'); dotenv.config();
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

function extractBandcampInfo(res) {
  return {
    artist: inflector.titleize(res.artist),
    title: inflector.titleize(res.raw.current.title),
    releaseDate: dateFormat(res.raw.album_release_date, "mm/dd/yyyy")
  };
}

async function findMetalArchivesLabel(info) {
  var res = await getMetalArchivesAlbumSearch(info);
  var url = extractMetalArchivesAlbumUrl(res);
  return await storeMetalArchivesLabel(url, info);
}

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

function extractMetalArchivesAlbumUrl(res) {
  var albumSearchResults = res.data.aaData;
  if (albumSearchResults.length >= 1) {
    var albumLink = parser.parse(albumSearchResults[0][1]);
    return albumLink.querySelector('a').getAttribute('href');
  }
}

async function storeMetalArchivesLabel(url, info) {
  if (!url) { return info; }
  var res = await axios.get(url);
  info.label = extractMetalArchivesLabel(res);
  return info;
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

async function findDiscogsLabel(info) {
  if (info.label) { return info; }

  var res = await discogsDB.search({
    artist: info.artist,
    release_title: info.title,
    type: 'release'
  });

  info.label = extractDiscogsLabel(res);
  return info;
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

async function foo() {
  var res = await getBandcampAlbumInfo(bandcampUrl)
  var info = extractBandcampInfo(res);
  info = await findMetalArchivesLabel(info);
  info = await findDiscogsLabel(info);
  log(info);
}

foo();