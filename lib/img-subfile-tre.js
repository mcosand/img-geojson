var fs = require('fs')
  , constants = require('./constants.js')
  , decoder = require('./bit-decoder.js')
  , SubFile = require('./img-subfile.js')

function readBounds(buf, offset) {
  var bounds = {
    north: decoder.read24Bit(buf, offset) * constants.MAP_TO_DEG,
    east: decoder.read24Bit(buf, offset + 3) * constants.MAP_TO_DEG,
    south: decoder.read24Bit(buf, offset + 6) * constants.MAP_TO_DEG,
    west: decoder.read24Bit(buf, offset + 9) * constants.MAP_TO_DEG
  };
  return bounds;
}

function readLevels(buf) {
  var offset = buf.readUInt32LE(0x21);
  var length = buf.readUInt32LE(0x25);
  var list = [];

  for (var i = offset; i < offset + length; i += 4) {
    var subDivCount = buf.readUInt16LE(i + 2);
    list.push({
      level: buf[i] & 0x0f,
      resolution: buf[i + 1],
      subdivisions: []
    });
  }
  return list;
}

function createSubdivision(lvl, levels) {
  var sub = {
    center: { mapLat: 0, mapLng: 0 },
    halfHeight: 0,
    halfWidth: 0,
    rgnOffset: 0,
    shapeTypes: constants.SHAPE_TYPES.POINTS,
    levelIdx: lvl,
    level: levels[lvl]    
  };
  levels[lvl].subdivisions.push(sub);
  return sub;
}

function readSubdivisions(buf, levels) {
  var divisions = {};

  var offset = buf.readUInt32LE(0x29);
  var length = buf.readUInt32LE(0x2d);
  var levelIndex = 0;

  for (var i = offset, n = 1; i < offset + length; n++) {
    var sub = divisions[n];
    if (sub) {
      // someone points to this division
      levelIndex = sub.levelIdx;
    } else {
      // nobody points to me.
      sub = createSubdivision(levelIndex, levels);
      divisions[n] = sub;
    }

    sub.rgnOffset = decoder.readU24Bit(buf, i);
    if (n > 1) {
      divisions[n - 1].length = sub.rgnOffset - divisions[n - 1].rgnOffset;
    }
    sub.shapeTypes = buf[i + 3];
    sub.center = {
      mapLng: decoder.read24Bit(buf, i + 4),
      mapLat: decoder.read24Bit(buf, i + 7)
    };
    sub.debugN = n;

    var width = buf.readUInt16LE(i + 10);
    var isTermination = (width | 0x80) > 0;
    sub.halfWidth = width & 0x7fff;
    sub.halfHeight = buf.readUInt16LE(i + 12);

    var nextN = -1;
    if (levelIndex < levels.length - 1) {
      nextN = buf.readUInt16LE(i + 14);
      if (nextN > 0) divisions[nextN] = createSubdivision(levelIndex + 1, levels);
      i += 2;
    }
    i += 14;
    
 //   console.log('DIV ' + n + ', LVL ' + levelIndex + ', NEXT ' + nextN + ', CENTER ' + JSON.stringify(sub.center) + ', SHAPES ' + sub.shapeTypes);
  }
}

function TreFile() {
  this.zoomLevels = [];
}

TreFile.read = function (fd, fat, blockSize) {
  var tre = new TreFile();
  var buf = new Buffer(fat.blocks.length * blockSize);

  for (var i = 0; i < fat.blocks.length; i++) {
    var offset = fat.blocks[i] * blockSize;
    fs.readSync(fd, buf, i * blockSize, blockSize, offset);
  }

  if (buf.toString('ascii', 2, 12) != 'GARMIN TRE') {
    throw 'Not a TRE file';
  }

  SubFile.readCommonHeader(buf, tre);

  tre.bounds = readBounds(buf, 0x15);

  tre.levels = readLevels(buf);
  readSubdivisions(buf, tre.levels);

  for (var i = 0; i < tre.levels.length; i++) {
    var l = tre.levels[i];
 //   console.log('   LVL ' + l.level + ', ' + l.subdivisions.length);
  }

  return tre;
};

module.exports = TreFile;