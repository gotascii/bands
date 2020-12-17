var fs = require('fs').promises;
var { GoogleSpreadsheet } = require('google-spreadsheet');
var templateFileName = '1111-11-11-index.html';

exports.generate = async(siteDirPath, spreadsheetId) => {
  var ss = new GoogleSpreadsheet(spreadsheetId);
  ss.useApiKey(process.env.GOOGLE_TOKEN);
  await ss.loadInfo();

  // TODO: return if ss not found!

  var year = ss.title;
  var opts = { recursive: true };
  var dataDirPath = `${siteDirPath}/_data/${year}`;
  await fs.mkdir(dataDirPath, opts);

  ss.sheetsByIndex.forEach(async(sheet) => {
    var title = sheet.title;
    var genre;
    if (title === 'AOTY') {
      genre = title;
    } else if (title.match(/AOTY/)) {
      genre = title.split(' ')[0];
    } else {
      return;
    }

    genre = genre.toLowerCase();
    var postsDirPath = `${siteDirPath}/${year}/${genre}/_posts`;

    await fs.mkdir(postsDirPath, opts);
    await fs.copyFile(`./files/${templateFileName}`, `${postsDirPath}/${templateFileName}`);

    var rows = await sheet.getRows();
    var data = [];
    rows.forEach(row => {
      data.push({
        id: 2532237670,
        genre: row.Genre,
        name: row.Name,
        album: row.Album,
        label: row.Label,
        link: row.Link,
        date: row.Date,
        comments: row.Comments
      });
    });

    data = JSON.stringify(data);
    await fs.writeFile(`${dataDirPath}/${genre}.json`, data);
  });
};
