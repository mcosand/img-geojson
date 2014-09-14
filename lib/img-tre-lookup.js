var constants = require('./constants.js')
  , intersects = require('./intersects.js')

function TreLookup() {
  var imgList = [];
  var lastModified = '';
  var bounds = {};

  this.divisionsInBounds = function divisionsInBounds(bounds, levelIdx) {
    var divisions = {};
    for (var i = 0; i < imgList.length; i++) {
      var imgInfo = imgList[i];
      if (!intersects(imgInfo.tre.bounds, bounds)) continue;

      for (var l = levelIdx; l >= 0; l--) {
        // console.log('%d ==============================', l);
        if (imgInfo.tre.levels[l] === undefined) continue;
        var level = imgInfo.tre.levels[l];
        var levelConversion = 360 / (1 << level.resolution);

        for (var j = 0; j < level.subdivisions.length; j++) {
          var sub = level.subdivisions[j];
          var subBounds = {
            north: sub.center.mapLat * constants.MAP_TO_DEG + sub.halfHeight * levelConversion,
            south: sub.center.mapLat * constants.MAP_TO_DEG - sub.halfHeight * levelConversion,
            west: sub.center.mapLng * constants.MAP_TO_DEG - sub.halfWidth * levelConversion,
            east: sub.center.mapLng * constants.MAP_TO_DEG + sub.halfWidth * levelConversion
          };
          if (intersects(subBounds, bounds)) {
            if (divisions[imgInfo.path] === undefined) {
              divisions[imgInfo.path] = { imgInfo: imgInfo, divisions: [] };
            }
            divisions[imgInfo.path].divisions.push(sub);
        //    console.log('will look at division %d', sub.debugN);
          }

          var subBounds = {
            north: sub.center.mapLat + sub.halfHeight * levelConversion * constants.DEG_TO_MAP,
            south: sub.center.mapLat - sub.halfHeight * levelConversion * constants.DEG_TO_MAP,
            west: sub.center.mapLng - sub.halfWidth * levelConversion * constants.DEG_TO_MAP,
            east: sub.center.mapLng + sub.halfWidth * levelConversion * constants.DEG_TO_MAP
          };
/*
          console.log("DECLARE @subdiv geometry = geometry::STGeomFromText('LINESTRING(%d %d, %d %d, %d %d, %d %d, %d %d)', 4326)",
  subBounds.west, subBounds.north,
  subBounds.east, subBounds.north,
  subBounds.east, subBounds.south,
  subBounds.west, subBounds.south,
  subBounds.west, subBounds.north
  );
  */
          //if (divisions[imgInfo.path] !== undefined)
          //console.log('now %d divisions', divisions[imgInfo.path].divisions.length);
        }
      }
    }
    return divisions;
  };

  this.push = function push(imgInfo) {
    imgList.push(imgInfo);
    if (imgInfo.modified > lastModified) {
      lastModified = imgInfo.modified;
      console.log('last modified now: ' + lastModified);
    }
    if (bounds.north === undefined || imgInfo.tre.bounds.north > bounds.north) { bounds.north = imgInfo.tre.bounds.north }
    if (bounds.south === undefined || imgInfo.tre.bounds.south < bounds.south) { bounds.south = imgInfo.tre.bounds.south }
    if (bounds.west === undefined || imgInfo.tre.bounds.west < bounds.west) { bounds.west = imgInfo.tre.bounds.west }
    if (bounds.east === undefined || imgInfo.tre.bounds.east > bounds.east) { bounds.east = imgInfo.tre.bounds.east }

  };

  this.getLastModified = function() {
    return lastModified;
  }

  this.getBounds = function () { return bounds; }
}

module.exports = TreLookup;
