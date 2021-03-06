# JavaScript OCF servers
This folder contains JavaScript implementation of the following OCF servers:
* Buzzer (x1)
* RGB LED (x1)


# Setting up the OCF servers
## Setting up the HW
You need the devce and sensors in the following list:
* 1x [Intel Joule 570x](http://www.intel.com/buy/us/en/product/emergingtechnologies/intel-joule-570x-developer-kit-541737)
* 1x [Grove Buzzer](http://www.seeedstudio.com/wiki/Grove_-_Buzzer)
* 1x [Grove Chainable RGB LED](http://www.seeedstudio.com/depot/twig-chainable-rgb-led-p-850.html?cPath=156_157)

### Wiring
For Joule pin number, please refer to this image:
![](https://github.com/rwaldron/galileo-io/blob/master/joule-breakout-names-pins-role.jpg)

|       Sensor      |   Pin  |          Link            |
|:-----------------:|:------:|:------------------------:|
| Buzzer            |   33   |[Grove Buzzer](https://www.seeedstudio.com/Grove-Buzzer-p-768.html)            |
| Chainable RGB LED | 7--Clock, 8--Data        |[Grove Chainable RGB LED](http://wiki.seeed.cc/Grove-Chainable_RGB_LED/)      |

### Software platform for OCF servers
All these OCF servers are running on the [Iot-Refkit OS](http://iot-ref-kit.ostc.intel.com/download/builds/intel-iot-refkit_master/latest/images/intel-corei7-64/), please choose the gateway type image.
You can flash the image to a USB drive and then boot Joule from USB drive.


### Launch the OCF servers
```
./init-ocf-servers.sh
```
After that, all the OCF servers and the REST API server are launched.
