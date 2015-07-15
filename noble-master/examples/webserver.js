//webserver.js

/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
/*global */
/*
A simple node.js application intended to read data from Analog pins on the Intel based development boards 
such as the Intel(R) Galileo and Edison with Arduino breakout board, and display it in a browser running on the client.
This demonstrates use of http.createServer, and fs.
MRAA - Low Level Skeleton Library for Communication on GNU/Linux platforms
Library in C/C++ to interface with Galileo & other Intel platforms, in a structured and sane API with port nanmes/numbering that match boards & with bindings to javascript & python.
  
Steps for installing MRAA & UPM Library on Intel IoT Platform with IoTDevKit Linux* image
Using a ssh client: 
1. echo "src maa-upm http://iotdk.intel.com/repos/1.1/intelgalactic" > /etc/opkg/intel-iotdk.conf
2. opkg update
3. opkg upgrade
Article: https://software.intel.com/en-us/xdk-sample-creating-a-web-server
*/

// Set this to the ip address of your board (not 127.0.0.1)
var ipAddress = '192.168.2.15'; 

var mraa = require('mraa'); //require mraa
console.log('MRAA Version: ' + mraa.getVersion()); //write the mraa version to the console

// Start by loading in some data
var fs = require('fs');

var lightSensorPage = fs.readFileSync('/node_app_slot/lightsensor.html');

// Insert the ip address in the code in the page

lightSensorPage = String(lightSensorPage).replace(/<<ipAddress>>/, ipAddress);

var analogPin0 = new mraa.Aio(0);


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
        value = analogPin0.read();
        res.writeHead(200, {'Content-Type': 'text/json'});
        res.end(JSON.stringify({lightLevel:getLux(value), rawValue:value}));
    }
}).listen(1337, ipAddress);