var childProcess = require('child_process');

exports.log = (info) => {
  var line = `"${info.artist}","${info.title}","${info.label ||
  'Independent'}",${info.bandcampUrl},${info.releaseDate}`;

  console.log(line);

  var proc = childProcess.spawn('pbcopy');
  proc.stdin.write(line);
  proc.stdin.end();
};
