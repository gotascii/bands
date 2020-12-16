var disconnect = require('disconnect');

var ClientClass = disconnect.Client;
var client = new ClientClass({ userToken: process.env.DISCOGS_TOKEN });
var db = client.database();

function extractLabel(res) {
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

exports.findLabel = async ({ artist, title }) => {
  var res = await db.search({
    artist: artist,
    release_title: title,
    type: 'release'
  });

  return extractLabel(res);
}