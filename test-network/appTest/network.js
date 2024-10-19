var express = require('express');
var bodyParser = require('body-parser');
var https = require('https');
var gdriveJS = require('./gdrive.js');
var functionsJS = require('./functions.js');
var transactionJS = require('./transactionHandler.js');
var app = express();
const fs = require('fs');

// create application/json parser
var jsonParser = bodyParser.json();

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.post('/upload/credential', jsonParser, function (req, res) {
   console.log('/upload/credential1', new Date().getTime());
   gdriveJS.upload(req.body.filepath, req.body.filename, '/get/credential');
   res.send("OK");
})

app.post('/get/credential', jsonParser, async function (req, res) {
   url = req.body.link;
   console.log('/get/credential1', new Date().getTime());
   gdriveJS.download(req.body.id, './userCredential.json', '/put/credential');
   res.send("OK");
})

app.post('/put/credential', jsonParser, function (req, res) {
   let credid = req.body.id;
   console.log(credid);
   let rawdata = fs.readFileSync('./userCredential.json');
   let cred = JSON.parse(rawdata);
   args = {credential: cred, id: credid, prkey: "0x6ee66421e9877edc05e1a85c3ec5e33f5428ba122ec17017b63d184733d464c0"};
   let strargs = JSON.stringify(args);
   console.log('/put/credential1', new Date().getTime());
   transactionJS.SCFunctionCaller("createCredential", strargs);
   res.send("OK");
})

app.post('/create/claim', function (req, res) {
   let rawdata = fs.readFileSync('./userCredential.json');
   let cred = JSON.parse(rawdata);
   args = {credential: cred, attributes: {"Attributes": ["Attr0", "Attr2"]}};
   let strargs = JSON.stringify(args);
   console.log('/create/claim1', new Date().getTime());
   transactionJS.SCFunctionCaller("createClaim", strargs);
   res.send('OK');
})

app.post('/upload/claim', jsonParser, function (req, res) {
   console.log('/upload/claim1', new Date().getTime());
   gdriveJS.upload(req.body.filepath, req.body.filename, '/get/claim');
   res.send("OK");
})

app.post('/get/claim', jsonParser, function (req, res) {
   url = req.body.link;
   console.log('/get/claim1', new Date().getTime());
   gdriveJS.download(req.body.id, './userClaim.json', '/check/claim');
   res.send("OK");
})

app.post('/check/claim', jsonParser, function (req, res) {
   let rawdata = fs.readFileSync('./userClaim.json');
   let claim = JSON.parse(rawdata);
   var sig = {"r":"0x5683f0585589c04429f80699d9b9e86e0078296e5ce37b2c708e135572f0a5b8","s":"0x42a3f3cfb8548117746c30231fb40d1000fd1dfa5e377e66f87318e1b10ace2c","v":28};
   args = {id: "Cred-ID-0", signature: sig, claim: claim, hash: "0x96a296d224f285c67bee93c30f8a309157f0daa35dc5b87e410b78630a09cfc7"};
   let strargs = JSON.stringify(args);
   console.log('/check/claim1', new Date().getTime());
   transactionJS.SCFunctionCaller("verifyRedactableCredential", strargs);
   res.send('OK');
})

app.post('/get/final', jsonParser, async function (req, res) {
   var resp = req.body.finalResponse;
   console.log(resp);
   console.log('End', new Date().getTime());
   res.send("OK");
})

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})
