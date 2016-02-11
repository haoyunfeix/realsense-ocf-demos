// License: Apache 2.0. See LICENSE file in root directory.
// Copyright(c) 2016 Intel Corporation. All Rights Reserved.

'use strict';

let os = require('os');
let jpeg = require('jpeg-turbo');
let express = require('express');
let app = express();
let server = require('http').createServer(app);
let WsServer = require('ws').Server;
let ptModule = require('node-person');
let childProcess = require('child_process');
let colors = require('colors');
let updateResource = require('../client').updateResource;
let getResource = require('../client').getResource;

let ptConfig = {tracking: {enable: true, trackingMode: 'following'}};
let cameraConfig = {color: {width: 320, height: 240, frameRate: 30, isEnabled: true},
                    depth: {width: 320, height: 240, frameRate: 30, isEnabled: true}};
let pt;
let ledList = {};
let led1LastChangeTime;
let led2LastChangeTime;
let led3LastChangeTime;
let led4LastChangeTime;

function initialLED() {
  getResource().then((data) => {
    ledList = data;
    closeAllLED();
  })
  .catch((err) => {
      console.log('Failed to get led id with error:' + err);
      process.exit();
  });
}

function closeAllLED() {
  updateResource(ledList['/a/rgbled1'], [255, 255, 255]);
  updateResource(ledList['/a/rgbled2'], [255, 255, 255]);
  updateResource(ledList['/a/rgbled3'], [255, 255, 255]);
  updateResource(ledList['/a/rgbled4'], [255, 255, 255]);

  setTimeout(() => {
    updateResource(ledList['/a/rgbled1'], [0, 0, 0]);
    updateResource(ledList['/a/rgbled2'], [0, 0, 0]);
    updateResource(ledList['/a/rgbled3'], [0, 0, 0]);
    updateResource(ledList['/a/rgbled4'], [0, 0, 0]);
  }, 1000);
}

initialLED();
let led1FlgOld = false;
let led2FlgOld = false;
let led3FlgOld = false;
let led4FlgOld = false;
function controlLEDbyPersons(persons) {
  let led1Flg = false;
  let led2Flg = false;
  let led3Flg = false;
  let led4Flg = false;
  persons.forEach((person) => {
    let distance = 0;
    if(person.trackInfo && person.trackInfo.center){
      distance = person.trackInfo.center.worldCoordinate.z;
    }
    if(distance <= 1 && distance > 0.5) {
      console.log(colors.blue(distance));
      led1Flg = true;
    }
    if(distance <= 1.5 && distance > 1) {
      console.log(colors.red(distance));
      led2Flg = true;
    }
    if(distance <= 2 && distance > 1.5) {
      console.log(colors.white(distance));
      led3Flg = true;
    }
    if(distance <= 2.5 && distance > 2) {
      console.log(colors.green(distance));
      led4Flg = true;
    }
  });
  if(led1FlgOld !== led1Flg) {
    if (led1Flg){
      console.log(('update led 1 with' + led1Flg).blue.bold);
    } else {
      console.log(('update led 1 with' + led1Flg).blue.inverse);
    }
    updateLedStatus('/a/rgbled1', led1Flg); led1FlgOld = led1Flg;
  }
  if(led2FlgOld !== led2Flg) {
    if (led2Flg){
      console.log(('update led 2 with' + led2Flg).red.bold);
    } else {
      console.log(('update led 2 with' + led2Flg).red.inverse);
    }
    updateLedStatus('/a/rgbled2', led2Flg); led2FlgOld = led2Flg;
  } 
  if(led3FlgOld !== led3Flg) {
    if (led3Flg){
      console.log(('update led 3 with' + led3Flg).white.bold);
    } else {
      console.log(('update led 3 with' + led3Flg).white.inverse);
    }
    updateLedStatus('/a/rgbled3', led3Flg); led3FlgOld = led3Flg;
  }
  if(led4FlgOld !== led4Flg) {
    if (led4Flg){
      console.log(('update led 4 with' + led4Flg).green.bold);
    } else {
      console.log(('update led 4 with' + led4Flg).green.inverse);
    }
    updateLedStatus('/a/rgbled4', led4Flg); led4FlgOld = led4Flg;
  }
}

function updateLedStatus(lid, state) {
    let lightColor;
    if(state) {
        lightColor = [255, 0, 0]
    } else {
        lightColor = [0, 0, 0]
    }
    updateResource(ledList[lid], lightColor);
}

  ptModule.createPersonTracker(ptConfig, cameraConfig).then((instance) => {
    pt = instance;
    console.log('Enabling Tracking with mode set to 0');
    startServer();
    pt.on('frameprocessed', function(result) {
      printPersonCount(result);
      pt.getFrameData().then((frame) => {
        sendRgbFrame(frame);
      });
      sendTrackingData(result);
      if(result.persons) {
        controlLEDbyPersons(result.persons);
      }
    });
    setTimeout(() => {
      return pt.start();
    }, 20000); 
  }).catch((error) => {
    console.log('error: ' + error);
  });

console.log('\n-------- Press Esc key to exit --------\n');

const ESC_KEY = '\u001b';
const CTRL_C = '\u0003';
let stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', function(key) {
  if (key === ESC_KEY || key === CTRL_C) {
    exit();
  }
});

function exit() {
  console.log('\n-------- Stopping --------');
  if (pt) {
    pt.stop().then(() => {
      closeAllLED();
      setTimeout(() => {
        process.exit();
      }, 2500)
    }).catch((error) => {
      console.log('error: ' + error);
      closeAllLED();
      setTimeout(() => {
        process.exit();
      }, 2500)
    });
  } else {
    closeAllLED();
    setTimeout(() => {
      process.exit();
    }, 2500)
  }
}

let lastPersonCount = 0;
let totalPersonIncrements = 0;
let prevPeopleInFrame = 0;
let prevPeopleTotal = 0;
let idSet = null;
let w = 25;

function printPersonCount(result) {
  let persons = result.persons;
  let numPeopleInFrame = 0;
  let newIdSet = new Set();

  persons.forEach(function(person) {
    newIdSet.add(person.trackInfo.id);
  });

  numPeopleInFrame = persons.length;

  if (numPeopleInFrame > lastPersonCount)
    totalPersonIncrements += (numPeopleInFrame - lastPersonCount);
  else if (numPeopleInFrame === lastPersonCount && idSet !== null) {
    let diff = new Set(Array.from(idSet).filter((x) => !newIdSet.has(x)));
    totalPersonIncrements += diff.size;
  }

  idSet = newIdSet;

  lastPersonCount = numPeopleInFrame;

  if (numPeopleInFrame !== prevPeopleInFrame || totalPersonIncrements !== prevPeopleTotal) {
    console.log(padding('Current Frame Total', w), padding('Cumulative', w));
    console.log(padding('--------------------', w), padding('----------', w));
    console.log(padding(numPeopleInFrame, w), padding(totalPersonIncrements, w));

    prevPeopleInFrame = numPeopleInFrame;
    prevPeopleTotal = totalPersonIncrements;
  }
}

function padding(string, width) {
  if (!(string instanceof String))
    string = String(string);
  let length = width - string.length;
  if (length <= 0) return string;
  return string + new Array(length + 1).join(' ');
}

function sendTrackingData(result) {
  if (!connected) {
    return;
  }
  let persons = result.persons;
  let resultArray = [];
  persons.forEach(function(person) {
    let trackInfo = person.trackInfo;
    if (trackInfo) {
      let element = {};
      let boundingBox = trackInfo.boundingBox;
      let center = trackInfo.center;
      element.pid = trackInfo.id;
      if(center && center.worldCoordinate) {
        element.distance = center.worldCoordinate.z;
      }
      element.cumulative_total = totalPersonIncrements;
      if (boundingBox) {
        element.person_bounding_box = {
          x: boundingBox.rect.x,
          y: boundingBox.rect.y,
          w: boundingBox.rect.width,
          h: boundingBox.rect.height,
        };
      }
      if (center) {
        element.center_mass_image = {
          x: center.imageCoordinate.x,
          y: center.imageCoordinate.x,
        };
        element.center_mass_world = {
          x: center.worldCoordinate.x,
          y: center.worldCoordinate.y,
          z: center.worldCoordinate.z,
        };
      }
      resultArray.push(element);
    }
  });
  let resultToDisplay = {
    Object_result: resultArray,
    type: 'person_tracking',
  };
  sendData(JSON.stringify(resultToDisplay));
}

function sendRgbFrame(frame) {
  if (!connected) {
    return;
  }
  let useJpeg = true;
  let width = frame.color.width;
  let height = frame.color.height;
  let rawData = frame.color.data;

  let imageBuffer;
  let imageBufferLength;
  if (useJpeg) {
    imageBuffer = encodeToJPEG(rawData, width, height);
    imageBufferLength = imageBuffer.byteLength;
  } else {
    imageBuffer = rawData;
    imageBufferLength = rawData.length;
  }

  const msgHeaderLength = 16;
  let msg = new ArrayBuffer(msgHeaderLength + imageBufferLength);
  let int8View = new Uint8Array(msg);
  int8View.set(imageBuffer, msgHeaderLength);

  let int16View = new Uint16Array(msg, 0, msgHeaderLength);
  const MSG_RGB = 3;
  const FrameFormat = {
    Raw: 0,
    Jpeg: 1,
  };

  // The schema of the sent message:
  // |type|format|width|height|padding|time|data|
  // type: 1 byte, 3 means RGB frame data
  // format: 1 byte, 0 means raw data with out encoding, 1 means jpeg
  // width: 2 bytes, width of the frame data
  // height: 2 bytes, height of the frame data
  // padding: 2 bytes
  // time: 8 bytes, time stamp, not used currently.
  // data: the RGB data.
  int8View[0] = MSG_RGB;  // type
  if (useJpeg)
    int8View[1] = FrameFormat.Jpeg;  // format, jpeg
  else
    int8View[1] = FrameFormat.Raw;  // format, raw
  int16View[1] = width;
  int16View[2] = height;
  int16View[3] = 0;  // padding

  sendData(msg);
}

let clients = [];
let connected = false;

function sendData(data) {
  if (clients.length !== 0) {
    try {
      clients.forEach((client) => {
        client.send(data);
      });
    } catch (exception) {
      console.log('Exception: send data failed exception:', exception);
    }
  }
}

function encodeToJPEG(buffer, width, height) {
  let options = {
    format: jpeg.FORMAT_RGB,
    width: width,
    height: height,
    quality: 80,
  };
  let jpegImageData = jpeg.compressSync(buffer, options);
  return jpegImageData;
}

function getEthernetIp() {
  let ifaces = os.networkInterfaces();
  let ip = '';
  for (let ifname in ifaces) {
    if (ifname === undefined)
      continue;
    ifaces[ifname].forEach(function(iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        return;
      }
      ip = iface.address;
    });
    if (ip !== '')
      return ip;
  }
  return ip;
}

function startServer() {
  // Share the ui-browser code from cpp sample
  app.use(express.static('./ui-browser/src'));
  const ip = getEthernetIp();
  const port = 8000;
  server.listen(port, ip);
  let wss = new WsServer({
    server: server,
  });

  console.log('\nEthernet ip:' + ip);
  console.log(' >>> point your browser to: http://' + ip + ':' + port + '/view.html');

  wss.on('connection', function(client) {
    console.log('server: got connection ' + client._socket.remoteAddress + ':' +
        client._socket.remotePort);
    clients.push(client);
    if (!connected)
      connected = true;
    client.on('close', function() {
      console.log('server: disconnect ' + client._socket.remoteAddress + ':' +
          client._socket.remotePort);
      let index = clients.indexOf(client);
      if (index > -1) {
        clients.splice(index, 1);
      }
      if (clients.length === 0)
        connected = false;
    });
  });
}
