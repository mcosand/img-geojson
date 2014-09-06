var fs = require('fs')
  , path = require('path')
  , async = require('async')
  , Promise = require('bluebird')
  , builder = require('./lib/img-tree-builder.js')
  , Lookup = require('./lib/img-tre-lookup.js')
  , config = require('./config.js')()

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

loadTree(config.dataPath).then(function (lookup) {
  var zoom = 3;
  var divisions = lookup.divisionsInBounds({ north: 47.533, west: -121.83, south: 47.4, east: -121.55 }, zoom);
  console.log(divisions.length + ' subdivisions for area at zoom ' + zoom);
});