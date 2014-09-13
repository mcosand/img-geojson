var fs = require('fs')
  , path = require('path')
  , async = require('async')
  , Promise = require('bluebird')
  , builder = require('./lib/img-tree-builder.js')
  , Lookup = require('./lib/img-tre-lookup.js')
  , RgnFile = require('./lib/img-subfile-rgn.js')
  , config = require('./config.js')()
  , compression = require('compression')
  , tileCalc = require('./lib/tile-calc.js')
  , intersects = require('./lib/intersects.js')

Promise.promisifyAll(fs);

var express = require('express')
var app = express();
//app.use(compression());

var lookup;

app.get('/nwtopo/trails/:zoom/:col/:row.json', function (req, res, next) {
  getTile('trails', [0x16], true, req, res, next);
});

app.get('/nwtopo/contours/:zoom/:col/:row.json', function (req, res, next) {
  getTile('contours', [0x20, 0x21, 0x22], false, req, res, next);
});


app.use(express.static(__dirname + '/www'));

var server = null;

function loadTree(searchRoot) {
  return new Promise(function (resolve, reject) {
    lookup = new Lookup();

    function learnFile(imgFile, callback) {
      builder(imgFile)
      .then(function (imgInfo) {
        //console.log('push ' + imgFile);
        //console.log(imgInfo.title);
        lookup.push(imgInfo);
      })
      .finally(function () {
        callback();
      });
    }

    function finishUp() {
      console.log('data bounds: ' + JSON.stringify(lookup.getBounds()));
      //console.log('loaded');
      resolve(lookup);
    }

    var imgFiles = fs.readdirSync(searchRoot)
      .filter(function (file) { return file.substr(-4).toLowerCase() === '.img'; })
      .map(function (item) { return path.join(searchRoot, item); });
    //console.log(imgFiles.length + ' files to process');
    var queue = async.queue(learnFile, 3);
    queue.drain = finishUp;
    queue.push(imgFiles);

    //console.log('running');
  });
}

function getShapes(resultSet, bounds, polyTypes) {
  return new Promise(function (resolve, reject) {
    var collection = { type: 'FeatureCollection', features: [] };
    function finish() {
      resolve(collection);
    }

    function processFile(filePath, callback) {
      fs.openAsync(filePath, 'r').then(function (fd) {
        Array.prototype.push.apply(collection.features, RgnFile.getShapes(
          resultSet[filePath].divisions,
          bounds,
          polyTypes,
          resultSet[filePath].imgInfo.rgnFAT,
          resultSet[filePath].imgInfo.lblFile,
          fd
          ));
      })
      .finally(function () { callback() });
    }

    var queue = async.queue(processFile, 10);
    queue.drain = finish;
    queue.push(Object.keys(resultSet));
  });
}

loadTree(config.dataPath).then(function (lookup) {
  server = app.listen(3000, function () {
    console.log('Started on port %d', server.address().port);
  });
});

function getTile(layerName, polyTypes, doSave, req, res, next) {
  var zoom = 4;
  var reqX = req.params.col * 1;
  var reqY = req.params.row * 1;
  var reqZ = req.params.zoom * 1;

  var bounds = tileCalc.xyz2bounds(reqX, reqY, reqZ);

  if (!intersects(bounds, lookup.getBounds())) {
    res.status(404).send('out of bounds');
    console.log(req.originalUrl + ' out of bounds');
    return;
  }

  var folder = __dirname + '/www/nwtopo/' + layerName;
  if (!fs.existsSync(folder)) { fs.mkdir(folder) }
  folder += '/' + reqZ;
  if (!fs.existsSync(folder)) { fs.mkdir(folder) }
  folder += '/' + reqX;
  if (!fs.existsSync(folder)) { fs.mkdir(folder) }

  var file = folder + '/' + reqY + '.json'
  if (fs.existsSync(file) && fs.statSync(file).ctime > lookup.getLastModified()) {
    console.log('found cached tile for ' + req.originalUrl);
    res.send(fs.readFileSync(file));
    return;
  }

  // console.log('dynamically fetching ' + req.originalUrl);
  var divisions = lookup.divisionsInBounds(bounds, zoom);

  getShapes(divisions, bounds, polyTypes).then(function (shapes) {
    var result = JSON.stringify(shapes);
    if (doSave) {
      console.log('saving ' + req.originalUrl + ' as ' + file);
      fs.writeFileSync(file, result);
    }
    res.send(result);
  });
};