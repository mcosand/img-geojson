var constants = require('./constants.js')

function TreLookup() {
  var imgList = [];

  function intersects(left, right) {
    var a = left.west < right.east;
    var b = left.east > right.west;
    var c = left.north > right.south;
    var d = left.south < right.north;

    if (false) {
      console.log(JSON.stringify(left) + ' intersects ' + JSON.stringify(right) + "??");

      console.log(a);
      console.log(b);
      console.log(c);
      console.log(d);
    }
    return (a && b && c && d);
  }
  
  this.divisionsInBounds = function divisionsInBounds(bounds, levelIdx) {
    var divisions = [];
    for (var i = 0; i < imgList.length; i++) {
      var imgInfo = imgList[i];
      
      if (!intersects(imgInfo.tre.bounds, bounds)) continue;
      
      var level = imgInfo.tre.levels[levelIdx];
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
        }
      }
    }
    return divisions;
  };

  this.push = function push(imgInfo) {
    imgList.push(imgInfo);
//    console.log(imgList.length);
  }
}

module.exports = TreLookup;
