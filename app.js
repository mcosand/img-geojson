var fs = require('fs')
  , path = require('path')
  , async = require('async')
  , Promise = require('bluebird')
  , builder = require('./lib/img-tree-builder.js')
  , Lookup = require('./lib/img-tre-lookup.js')
  , RgnFile = require('./lib/img-subfile-rgn.js')
  , config = require('./config.js')()

Promise.promisifyAll(fs);

function loadTree(searchRoot) {
  return new Promise(function (resolve, reject) {
    var lookup = new Lookup();

    function learnFile(imgFile, callback) {
      builder(imgFile)
      .then(function (imgInfo) {
        console.log('push ' + imgFile);
        console.log(imgInfo.title);
        lookup.push(imgInfo);
      })
      .finally(function () {
        callback();
      });
    }

    function finishUp() {
      console.log('loaded');
      resolve(lookup);
    }

    var imgFiles = fs.readdirSync(searchRoot)
      .filter(function (file) { return file.substr(-4).toLowerCase() === '.img'; })
      .map(function (item) { return path.join(searchRoot, item); });
    console.log(imgFiles.length + ' files to process');
    var queue = async.queue(learnFile, 3);
    queue.drain = finishUp;
    queue.push(imgFiles);

    console.log('running');
  });
}

function getShapes(resultSet) {
  return new Promise(function (resolve, reject) {
    var collection = { type: 'FeatureCollection', features: [] };
    function finish() {
      resolve(collection);
    }

    function processFile(filePath, callback) {
      fs.openAsync(filePath, 'r').then(function (fd) {
        console.log(resultSet[filePath].imgInfo.title);
        Array.prototype.push.apply(collection.features, RgnFile.getShapes(
          resultSet[filePath].divisions,
          resultSet[filePath].imgInfo.rgnFAT,
          resultSet[filePath].imgInfo.lblFile,
          fd
          ));
        console.log('in file');
      })
      .finally(function () { callback() });
    }

    var queue = async.queue(processFile, 10);
    queue.drain = finish;
    queue.push(Object.keys(resultSet));
  });
}

loadTree(config.dataPath).then(function (lookup) {
  var zoom = 3;
  //  var divisions = lookup.divisionsInBounds({ north: 47.533, west: -121.83, south: 47.4, east: -121.55 }, zoom);
  var divisions = lookup.divisionsInBounds({ north: 48, west: -123, south: 47.4, east: -122 }, zoom);


  // debug count
  var count = 0;
  for (var i in divisions) {
    count += divisions[i].divisions.length;
    console.log(i);
  }
  console.log(count + ' divisions across ' + Object.keys(divisions).length + ' files');
  // debug count - end

  //var testDiv = divisions['c:\\code\\garmin\\topo\\10216001.img'].divisions[0];
  //console.log('div # ' + testDiv.debugN)

  getShapes(divisions).then(function (shapes) {
    console.log(JSON.stringify(shapes));
  });
});