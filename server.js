﻿var fs = require('fs')
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
  , mapnik = require('mapnik')
  , mercator = require('./sphericalmercator.js')

if (mapnik.register_default_input_plugins) mapnik.register_default_input_plugins();
mapnik.register_system_fonts();

Promise.promisifyAll(fs);

var express = require('express')
var app = express();
app.use(compression());

var lookup;
app.use('/nwtopo', express.static(__dirname + '/www'));

app.get('/nwtopo/trails/:zoom/:col/:row.json', function (req, res, next) {
  getTile('trails', ['l19','l22'], true, req, res, next);
});

app.get('/nwtopo/contours/:zoom/:col/:row.json', function (req, res, next) {
  getTile('contours', ['l32','l33','l34'], true, req, res, next);
});

app.get('/nwtopo/trails/:zoom/:col/:row.png', function(req, res, next) {
  getTile('trails', ['l19', 'l22'], false, req, res, next);
})

var server = null;

var map = new mapnik.Map(256, 256)
var mapXml = fs.readFileSync('nwtopo.xml', 'utf8');

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
        fs.closeSync(fd);
      })
      .finally(function () { callback() });
    }

    var queue = async.queue(processFile, 10);
    queue.drain = finish;
    queue.push(Object.keys(resultSet));
  });
}

loadTree(config.dataPath).then(function (lookup) {
  server = app.listen(process.env.PORT || 3000, function () {
    console.log('Started on port %d', server.address().port);
  });
});

function getTile(layerName, polyTypes, asJson, req, res, next) {
  var reqX = req.params.col * 1;
  var reqY = req.params.row * 1;
  var reqZ = req.params.zoom * 1;

  if (reqZ > 18 || reqZ < 11) {
    res.status(404).send('out of bounds. Use zoom levels 11-18');
    return;
  }

  var zoom = reqZ < 14 ? req < 12 ? 2 : 3 : 4;
//  console.log(zoom);

  var bounds = tileCalc.xyz2bounds(reqX, reqY, reqZ);
  if (!intersects(bounds, lookup.getBounds())) {
    res.status(404).send('out of bounds');
    console.log(req.originalUrl + ' out of bounds');
    return;
  }

  var folder = __dirname + '/www/nwtopo/' + layerName;
  if (!fs.existsSync(folder)) { try { fs.mkdirSync(folder) } catch (e) { } }
  folder += '/' + reqZ;
  if (!fs.existsSync(folder)) { try { fs.mkdirSync(folder) } catch(e) { } }
  folder += '/' + reqX;
  if (!fs.existsSync(folder)) { try { fs.mkdirSync(folder) } catch(e) { } }



  var file = folder + '/' + reqY + (asJson ? '.json' : '.png')
  if (fs.existsSync(file) && fs.statSync(file).ctime > lookup.getLastModified()) {
    fs.readFile(file, function (err, data) {
      if (err) throw err;
      res.contentType('application/json');
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(data);
    });
    return;
  }

  var divisions = lookup.divisionsInBounds(bounds, zoom);

  getShapes(divisions, bounds, polyTypes).then(function (shapes) {
    var result = JSON.stringify(shapes);
      console.log('saving ' + req.originalUrl + ' as ' + file);
      
      if (asJson) {
        fs.writeFileSync(file, result);
        res.contentType('application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.send(result);
      } else {
        var tileXml = mapXml.replace("%%BOUNDS%%", bounds.west+','+bounds.south+','+bounds.east+','+bounds.north).replace("%%THEDATA%%", result);
        var map = new mapnik.Map(256, 256)

        map.fromString(tileXml, {}, function(err, map) {
        map.zoomToBox(mercator.xyz_to_envelope(reqX, reqY, reqZ, false));
        var im = new mapnik.Image(256, 256);
        map.render(im, function(err, im) {
          im.encode('png', function(err, buffer) {
            fs.writeFile(file.replace('.json', '.png'), buffer, function(err) {
               res.contentType('image/png');
               res.send(fs.readFileSync(file))
            })
          })
        })
      })
      }
  });
};