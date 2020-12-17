var bandcamp = require('bandcamp-scraper');
var fs = require('fs').promises;
var { GoogleSpreadsheet } = require('google-spreadsheet');
var util = require('util');

var getAlbumInfo = util.promisify(bandcamp.getAlbumInfo);
var templateFileName = '1111-11-11-index.html';
var opts = { recursive: true };
var aotyRegex = /AOTY/;

async function loadSpreadsheet(spreadsheetId) {
  var ss = new GoogleSpreadsheet(spreadsheetId);
  ss.useApiKey(process.env.GOOGLE_TOKEN);
  await ss.loadInfo();
  return ss;
}

function calculateGenre(title) {
  if (title.match(aotyRegex)) {
    return title.split(' ')[0].toLowerCase();
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
  var res = await getAlbumInfo(row.Link);
  return {
    id: res.raw.id,
    genre: row.Genre,
    name: row.Name,
    album: row.Album,
    label: row.Label,
    link: row.Link,
    date: row.Date,
    comments: row.Comments
  };
}

async function handleSheet(sheet) {
  var genre = calculateGenre(sheet.title);
  if (!genre) { return false; }

  var rows = await sheet.getRows();
  if (rows.length === 0) { return false; }

  var data = rows.map(handleRow);
  data = await Promise.all(data);
  data = JSON.stringify(data);
  var dataDirPath = `${siteDirPath}/_data/${ss.title}`;
  await fs.mkdir(dataDirPath, opts);
  await fs.writeFile(`${dataDirPath}/${genre}.json`, data);

  await populatePostsDir(siteDirPath, ss.title, genre);

  return sheet;
}

exports.generate = async(siteDirPath, spreadsheetId) => {
  var ss = await loadSpreadsheet(spreadsheetId);
  var processedSheets = ss.sheetsByIndex.map(handleSheet);
  await Promise.all(processedSheets);
};
