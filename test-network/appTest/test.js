var functionsJS = require('./functions.js');

data = JSON.stringify({
    filepath: 'files/userCredential.json',
    filename: 'userCredential.json'
});

console.log('Start', new Date().getTime());

functionsJS.sendPostRequest(data, 'POST', '127.0.0.1', '/upload/credential', 8081);