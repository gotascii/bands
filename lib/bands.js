var bandcamp = require('./bandcamp');
var childProcess = require('child_process');
var discogs = require('./discogs');
var metalArchives = require('./metalArchives');

exports.generateCsv = async(bandcampUrl) => {
  info = await bandcamp.findInfo(bandcampUrl);
  params = {
    artist: info.artist,
    title: info.title
  };
  info.label = await metalArchives.findLabel(params);
  info.label ||= await discogs.findLabel(params);

  var csv = `"${info.artist}","${info.title}","${info.label ||
  'Independent'}",${info.bandcampUrl},${info.releaseDate}`;

  var proc = childProcess.spawn('pbcopy');
  proc.stdin.write(csv);
  proc.stdin.end();

  console.log(csv);
};
