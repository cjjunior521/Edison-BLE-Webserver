// webserver-peripheral-data.js 

var async = require('async');
var noble = require('noble');
var fs = require('fs'); 

//Set to IP address of board
var ipAddress = '192.168.0.101'; 

// process.argv is an array containing the command line call parameters
// For example, if you invoked this script with
// node examples/peripheral-explorer.js 00aabbccddeeff00
// then process.argv[0] is "node",
// process.argv[1] is "examples/peripheral-explorer.js",
// and process.argv[2] is "00aabbccddeeff00"
// The below line assigns that third member (if one is provided) to be
// the value of the variable peripheralUuid, which is searched for later
// in the code. The implication is that if you don't provide a UUID value as a
// command line argument, the rest of the code will not function properly.                 
//var peripheralUuid = process.argv[2];
                 
var lightSensorPage = fs.readFileSync('/node_app_slot/lightsensor.html'); 

// Insert the ip address in the code in the page

lightSensorPage = String(lightSensorPage).replace(/<<ipAddress>>/, ipAddress);

//from peripheral-explorer.js
/*noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});
*/

//from readNotification.js 
// The scanning function
function scan(state){
  if (state === 'poweredOn') {    // if the radio's on, scan for this service
    noble.startScanning([targetService], false);
    console.log("Started scanning");
  } else {                        // if the radio's off, let the user know:
    noble.stopScanning();
    console.log("Is Bluetooth on?");
  }
}

// the main discovery function
function findMe (peripheral) {
  console.log('discovered ' + peripheral.advertisement.localName);
  peripheral.connect();     // start connection attempts

  // called only when the peripheral has the service you're looking for:
  peripheral.on('connect', connectMe);

  // the connect function. This is local to the discovery function
  // because it needs the peripheral to discover services:
  function connectMe() {
    noble.stopScanning();
      
      //from peripheral-explorer.js
    console.log('peripheral with UUID ' + peripheral.uid + ' found');
    var advertisement = peripheral.advertisement;

    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;

    if (localName) {
      console.log('  Local Name        = ' + localName);
    }

    if (txPowerLevel) {
      console.log('  TX Power Level    = ' + txPowerLevel);
    }

    if (manufacturerData) {
      console.log('  Manufacturer Data = ' + manufacturerData.toString('hex'));
    }

    if (serviceData) {
      console.log('  Service Data      = ' + serviceData);
    }

    if (localName) {
      console.log('  Service UUIDs     = ' + serviceUuids);
    }
      //end from peripheral-explorer.js
      
    console.log('Checking for services on ' + peripheral.advertisement.localName);
    // start discovering services:
    peripheral.discoverSomeServicesAndCharacteristics(['fff0'],['fff1'], exploreMe);
  }

  // when a peripheral disconnects, run disconnectMe:
  peripheral.on('disconnect', disconnectMe);
}

// the service/characteristic exploration function:
function exploreMe(error, services, characteristics) {
  console.log('services: ' + services);
  console.log('characteristics: ' + characteristics);

  for (c in characteristics) {
    characteristics[c].notify(true);    // turn on notifications
    // whenever a notify event happens, get the result.
    // this handles repeated notifications:
    characteristics[c].on('read', listenToMe);
   }
}

// the notification read function:
function listenToMe (data, notification) {
  if (notification) {   // if you got a notification
    var value = data.readIntLE(0);  // read the incoming buffer as a float
    console.log('value: ' + value);   // print it
  }
}

function disconnectMe() {
  console.log('peripheral disconnected');
  // exit the script:
  process.exit(0);
}

var http = require('http');
http.createServer(function (req, res) {
   // var value;
    // This is a very quick and dirty way of detecting a request for the page
    // versus a request for light values
    if (req.url.indexOf('lightsensor') != -1) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(lightSensorPage);
    }
    else {
        value = 125;
        res.writeHead(200, {'Content-Type': 'text/json'});
        res.end(JSON.stringify({lightLevel:getLux(value), rawValue:value}));
    }
}).listen(1337, ipAddress);

/* ----------------------------------------------------
  The actual commands that start the program are below:
*/

noble.on('stateChange', scan);  // when the BT radio turns on, start scanning
noble.on('discover', findMe);   // when you discover a peripheral, run findMe()

/*
noble.on('discover', function(peripheral) {
  if (peripheral.uuid === peripheralUuid) {
    noble.stopScanning();

    console.log('peripheral with UUID ' + peripheralUuid + ' found');
    var advertisement = peripheral.advertisement;

    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;

    if (localName) {
      console.log('  Local Name        = ' + localName);
    }

    if (txPowerLevel) {
      console.log('  TX Power Level    = ' + txPowerLevel);
    }

    if (manufacturerData) {
      console.log('  Manufacturer Data = ' + manufacturerData.toString('hex'));
    }

    if (serviceData) {
      console.log('  Service Data      = ' + serviceData);
    }

    if (localName) {
      console.log('  Service UUIDs     = ' + serviceUuids);
    }

    console.log();

    explore(peripheral);
  }
});


function explore(peripheral) {
  console.log('services and characteristics:');

  peripheral.on('disconnect', function() {
    process.exit(0);
  });

  peripheral.connect(function(error) {
    peripheral.discoverServices([], function(error, services) {
      var serviceIndex = 0;

      async.whilst(
        function () {
          return (serviceIndex < services.length);
        },
        function(callback) {
          var service = services[serviceIndex];
          var serviceInfo = service.uuid;

          if (service.name) {
            serviceInfo += ' (' + service.name + ')';
          }
          console.log(serviceInfo);

          service.discoverCharacteristics([], function(error, characteristics) {
            var characteristicIndex = 0;

            async.whilst(
              function () {
                return (characteristicIndex < characteristics.length);
              },
              function(callback) {
                var characteristic = characteristics[characteristicIndex];
                var characteristicInfo = '  ' + characteristic.uuid;

                if (characteristic.name) {
                  characteristicInfo += ' (' + characteristic.name + ')';
                }

                async.series([
                  function(callback) {
                    characteristic.discoverDescriptors(function(error, descriptors) {
                      async.detect(
                        descriptors,
                        function(descriptor, callback) {
                          return callback(descriptor.uuid === '2901');
                        },
                        function(userDescriptionDescriptor){
                          if (userDescriptionDescriptor) {
                            userDescriptionDescriptor.readValue(function(error, data) {
                              if (data) {
                                characteristicInfo += ' (' + data.toString() + ')';
                              }
                              callback();
                            });
                          } else {
                            callback();
                          }
                        }
                      );
                    });
                  },
                  function(callback) {
                        characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');

                    if (characteristic.properties.indexOf('read') !== -1) {
                      characteristic.read(function(error, data) {
                        if (data) {
                          var string = data.toString('ascii');

                          characteristicInfo += '\n    value       ' + data.toString('hex') + ' | \'' + string + '\'';
                        }
                        callback();
                      });
                    } else {
                      callback();
                    }
                  },
                  function() {
                    console.log(characteristicInfo);
                    characteristicIndex++;
                    callback();
                  }
                ]);
              },
              function(error) {
                serviceIndex++;
                callback();
              }
            );
          });
        },
        function (err) {
          peripheral.disconnect();
        }
      );
    });
  });
}

var http = require('http');
http.createServer(function (req, res) {
    var value;
    // This is a very quick and dirty way of detecting a request for the page
    // versus a request for light values
    if (req.url.indexOf('lightsensor') != -1) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(lightSensorPage);
    }
    else {
        value = 125;
        res.writeHead(200, {'Content-Type': 'text/json'});
        res.end(JSON.stringify({lightLevel:getLux(value), rawValue:value}));
    }
}).listen(1337, ipAddress);
*/