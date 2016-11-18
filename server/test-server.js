var net = require('net');
var Promise = require('bluebird');

function checkConnection(host, port, timeout) {
  return new Promise(function(resolve, reject) {
    timeout = timeout || 10000;     // default of 10 seconds
    var timer = setTimeout(function() {
      reject("timeout");
      socket.end();
    }, timeout);
    var socket = net.createConnection(port, host, function() {
      clearTimeout(timer);
      resolve();
      socket.end();
    });
    socket.on('error', function(err) {
      clearTimeout(timer);
      reject(err);
    });
  });
}

checkConnection("192.168.0.49", 3010).then(function() {
  console.log('YES ITS AVAILABLE ');
  // successful
}, function(err) {
  console.log('OOPS');
  console.log(err);
  // error
})
