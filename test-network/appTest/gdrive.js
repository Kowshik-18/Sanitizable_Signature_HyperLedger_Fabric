const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
var functionsJS = require('./functions.js');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the given callback function.
 */
function authorize(credentials, callback, file, name, path) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, file, name, path);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}
/**
* Describe with given media and metaData and upload it using google.drive.create method()
*/ 
function uploadFile(auth, file, name, wpath) {
  var documentId = '';
  const drive = google.drive({version: 'v3', auth});
  const fileMetadata = {
    'name': name,
    parents: ['1aSdbs12_p71yWWwfGsdbBcgioIhViGii']
  };

  const media = {
    mimeType: 'text/plain',
    body: fs.createReadStream(file)
  };

  drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  }, (err, gfile) => {
    if (err) {
      // Handle error
      console.error(err);
    } else {
      documentId = gfile.data.id;
        drive.permissions.create({
          fileId: documentId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          }
        });
        drive.files.get({
          fileId: documentId, fields: 'webContentLink, size'
        }, function (err, result) {
            if (result.data.size <= 0) uploadFile(auth, file, name);
            else {
              //console.log(result.data);
              toSend = result.data.webContentLink;
              //console.log("Shareable Link: ");
              //console.log(toSend);
              data = JSON.stringify({
                link: toSend,
                id: documentId
              });
              functionsJS.sendPostRequest(data, 'POST', '127.0.0.1', wpath, 8081);
            }
        });
    }
  });
}

function upload(filepath, filename, path) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), uploadFile, filepath, filename, path);
  });
}

function downloadFile(auth, fid, destname, wpath) {
  const drive = google.drive({version: 'v3', auth});
  var num = (Math.random()*1000000);
  var id = "Cred-ID-" + num.toString();
  var fileId = fid;
  var dest = fs.createWriteStream(destname);
  drive.files.get({fileId: fileId, alt: 'media'}, {responseType: 'stream'},
  function(err, res){
      res.data
      .on('end', () => {
        console.log('Done');
        data = JSON.stringify({
            id: id
        });
        functionsJS.sendPostRequest(data, 'POST', '127.0.0.1', wpath, 8081);
      })
      .on('error', err => {
        console.log('Error', err);
      })
      .pipe(dest);
  })
}

function download(fid, filename, path) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), downloadFile, fid, filename, path);
  });
}

module.exports = {
  upload,
  download,
}
