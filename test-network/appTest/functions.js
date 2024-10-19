const http = require('http');

function sendPostRequest(data, method, host, path, port) {

    var options = {
        hostname: host,
        port: port,
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const send = http.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`)

        res.on('data', d => {
            process.stdout.write(d)
        })
    });

    send.on('error', error => {
        console.error(error)
    })

    send.write(data);
    send.end();
}


module.exports = {
    sendPostRequest,
}