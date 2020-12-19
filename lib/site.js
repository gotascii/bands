var bandcamp = require('./bandcamp');
var fs = require('fs').promises;
var { GoogleSpreadsheet } = require('google-spreadsheet');
var util = require('util');

var aotyRegex = /AOTY/;
var opts = { recursive: true };
var sleep = util.promisify(setTimeout);
var templateFileName = '1111-11-11-index.html';

async function loadSpreadsheet(spreadsheetId) {
  var ss = new GoogleSpreadsheet(spreadsheetId);
  ss.useApiKey(process.env.GOOGLE_TOKEN);
  process.stdout.write('Loading sheet...');
  await ss.loadInfo();
  process.stdout.write('Done\r');
  return ss;
}

function calculateGenre(title) {
  if (title.match(aotyRegex)) {
    // return title.split(' ')[0].toLowerCase();
    return title.split(' ')[0];
  }
  return false;
}

async function populatePostsDir(siteDirPath, year, genre) {
  var postsDirPath = `${siteDirPath}/${year}/${genre}/_posts`;
  var postsFilePath = `${postsDirPath}/${templateFileName}`;
  var templateFilePath = `${__dirname}/../files/${templateFileName}`;

  await fs.mkdir(postsDirPath, opts);
  await fs.copyFile(templateFilePath, postsFilePath);
}

async function handleRow(row) {
  var info;
  try {
    var pause = Math.random() * 15000;
    await sleep(pause);
    info = await bandcamp.findInfo(row.Link);
  } catch (err) {
    return false;
  }

  return {
    id: info.id,
    type: info.type,
    genre: row.Genre,
    name: row.Name,
    album: row.Album,
    label: row.Label,
    link: row.Link,
    date: row.Date,
    comments: row.Comments
  };
}

async function handleSheet(siteDirPath, ss, worksheet) {
  var genre = calculateGenre(worksheet.title);
  if (!genre) { return false; }

  var rows = await worksheet.getRows();

  console.log(`${worksheet.title}: Processing rows`);
  var data = rows.map(handleRow);
  data = await Promise.all(data);
  data = data.filter(d => d);
  console.log(`${worksheet.title}: Done`);

  if (data.length === 0) { return false; }

  data = JSON.stringify(data);

  var dataDirPath = `${siteDirPath}/_data/${ss.title}`;
  await fs.mkdir(dataDirPath, opts);
  await fs.writeFile(`${dataDirPath}/${genre}.json`, data);

  await populatePostsDir(siteDirPath, ss.title, genre);

  return worksheet;
}

exports.generate = async(siteDirPath, spreadsheetId) => {
  var ss = await loadSpreadsheet(spreadsheetId);
  var processedSheets = ss.sheetsByIndex.map(worksheet => handleSheet(siteDirPath, ss, worksheet));
  await Promise.all(processedSheets);
};
