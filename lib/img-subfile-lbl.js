var fs = require('fs')
  , constants = require('./constants.js')
  , decoder = require('./bit-decoder.js')
  , SubFile = require('./img-subfile.js')

function LblFile(fatEntry) {
  var _fatEntry = fatEntry;
  var offsetMultiplier = null;
  var encoding = 0;
  var dataOffset = 0;

  function readHeader(fd) {
    if (offsetMultiplier == null) {
      var buf = new Buffer(236);
      //console.log('#### LBL file start byte: ' + _fatEntry.startByte);
      fs.readSync(fd, buf, 0, 236, _fatEntry.startByte);

      //console.log(buf.toString('ascii', 2, 2 + 10));
      if (buf.toString('ascii', 2, 2 + 10) != 'GARMIN LBL') {
        throw 'Not a LBL file';
      }

      dataOffset = buf.readUInt32LE(0x15);
      offsetMultiplier = buf.readUInt8(0x1D);
      if (offsetMultiplier > 1) throw "doesn't handle offset multiplier";

      encoding = buf.readUInt8(0x1E);
      if (encoding != 6) throw "only understands encoding 6";

      //console.log('data starts at ' + (_fatEntry.startByte + dataOffset))
    }
  }

  var charLookup = " ABCDEFGHIJKLMNOPQRSTUVWXYZ~~~~~0123456789~~~~~~";

  this.readLabel = function readLabel(fd, offset) {
    if (offset == 0) return null;

    readHeader(fd);
    var pos = offset;
    //s.log('reading at position ' + pos + ' with encoding ' + encoding);
    var buf = new Buffer(3);

    var label = '';
    var isShift = false;
    var done = false;
    while (!done) {
      //console.log('reading from ' + (_fatEntry.startByte + dataOffset + offset).toString(16));
      fs.readSync(fd, buf, 0, 3, _fatEntry.startByte + dataOffset + offset);
      //console.log(buf[0].toString(16) + ' ' + buf[1].toString(16) + ' ' + buf[2].toString(16));
      offset += 3;
      var codes = [
        (buf[0] >> 2) & 0x3f,
        (buf[0] & 0x03) << 4 | buf[1] >> 4,
        (buf[1] & 0x0F) << 2 | buf[2] >> 6,
        buf[2] & 0x3f
      ];

      for (var i = 0; i < 4; i++) {
        if (codes[i] == 0x1b) {
        } else if (codes[i] == 0x1c) {
        } else if (codes[i] >= 0x30) {
          done = true;
          break;
        } else {
          label += charLookup[codes[i]];
        }
      }
    }
    return label;
  }

}


module.exports = LblFile;