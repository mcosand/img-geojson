var fs = require('fs')
  , constants = require('./constants.js')
  , decoder = require('./bit-decoder.js')
  , SubFile = require('./img-subfile.js')
  , BitReader = require('./bitreader.js')

function RgnFile() {
}

function bitsInCoords(bbase, constantSign, hasExtraBit) {
  var n = 2 + (bbase < 10 ? bbase : (2 * bbase - 9));
  n += (constantSign ? 0 : 1);
  n += (hasExtraBit ? 1 : 0);
  return n;
}
function readCoordinateHalf(reader, numBits, isNegative, signSame) {
  var delta = 0;
  if (signSame) {
    var bits = reader.next(numBits);
    delta = bits * (isNegative ? -1 : 1);
  } else {
    delta = reader.next(numBits - 1);
    var sign = reader.nextBit();
    if (sign) {
      var negate = (1 << (numBits - 1));
      if (delta == 0) {
        delta = readCoordinateHalf(reader, numBits, null, false);
        delta = ((negate - 1) * ((delta < 0) ? -1 : 1)) + delta;
      } else {
        delta = delta - negate;
      }
    }
  }
  return delta;
}

function getShapes(subDivisions, rgnFAT, lblFile, fd) {
  var shapes = [];
  var buf = new Buffer(255);
  var num = fs.readSync(fd, buf, 0, 29, rgnFAT.startByte);
  if (buf.toString('ascii', 2, 2 + 10) != 'GARMIN RGN') {
    throw 'Not an RGN file';
  }

  var dataRgnOffset = buf.readUInt32LE(0x15);
  var dataRgnLength = buf.readUInt32LE(0x19);

  for (var subIdx = 0; subIdx < 3 /* subDivisions.length */; subIdx++) {
    var subDivision = subDivisions[subIdx];

    console.log('rgn start: ' + rgnFAT.startByte + ', dataRgnOffset: ' + dataRgnOffset + ', dataRgnLength: ' + dataRgnLength);

    //console.log(subDivision);

    var rgnSegmentStart_File = rgnFAT.startByte + subDivision.rgnOffset + dataRgnOffset;
    var cursor = rgnSegmentStart_File;
    console.log('division data start: ' + rgnSegmentStart_File);
  //  console.log('divbuf method: ' + (rgnFAT.startByte + subDivision.rgnOffset + dataRgnOffset));
    var shapeOffsets = [];

    var first = true;
    if (subDivision.shapeTypes & constants.SHAPE_TYPES.POINTS) {
      shapeOffsets.push({ type: 'POINT', offset: 0 });
      first = false;
    }
    if (subDivision.shapeTypes & constants.SHAPE_TYPES.INDEXED_POINTS) {
      var info = { type: 'INDEXED_POINTS', offset: 0, end: subDivision.length };
      if (!first) {
        cursor += fs.readSync(fd, buf, 0, 2, cursor);
        info.offset = buf.readUInt16LE(0);
        shapeOffsets[shapeOffsets.length - 1].end = info.offset;
      }
      shapeOffsets.push(info);
      first = false;
    }
    if (subDivision.shapeTypes & constants.SHAPE_TYPES.POLYLINES) {
      var info = { type: 'POLYLINES', offset: 0, end: subDivision.length };
      if (!first) {
        cursor += fs.readSync(fd, buf, 0, 2, cursor);
        info.offset = buf.readUInt16LE(0);
        shapeOffsets[shapeOffsets.length - 1].end = info.offset;
      }
      shapeOffsets.push(info);
      first = false;
    }
    if (subDivision.shapeTypes & constants.SHAPE_TYPES.POLYGONS) {
      var info = { type: 'POLYGONS', offset: 0, end: subDivision.length };
      if (!first) {
        cursor += fs.readSync(fd, buf, 0, 2, cursor);
        info.offset = buf.readUInt16LE(0);
        shapeOffsets[shapeOffsets.length - 1].end = info.offset;
      }
      shapeOffsets.push(info);
      first = false;
    }
    if (shapeOffsets.length == 0) continue;

    shapeOffsets[0].offset = 2 * (shapeOffsets.length - 1);

    console.log(shapeOffsets);
    console.log('cursor after shapeOffsets: ' + cursor);

    // READ POLYGONS
    for (var typeIdx = 0; typeIdx < shapeOffsets.length; typeIdx++) {
      var info = shapeOffsets[typeIdx];
      var bitcursor = 0;
      var elementGroupStart = rgnSegmentStart_File + info.offset;
      if (info.type == 'POLYGONS' || info.type == 'POLYLINES') {
        var isLine = (info.type == 'POLYLINES');

        var elementStart = elementGroupStart;
        console.log('reading polygons!');
        console.log('is ' + (elementStart ) + ' < ' + info.end + '?');
        while (elementStart < info.end + rgnSegmentStart_File) {
          var shape = { type: "Feature", "geometry": { type: isLine ? "LineString" : "Polygon", coordinates: [] }, properties: {} };
          var line = [];

          fs.readSync(fd, buf, 0, 11, elementStart);
          shape.properties.type = buf.readUInt8(0) & 0x3f;
          var labelInfo = decoder.readU24Bit(buf, 1);
          shape.properties.name = lblFile.readLabel(fd, labelInfo & 0x3fffff);
          
          var hasExtraBit = labelInfo & 0x400000;
          var isTwoByte = (buf.readUInt8(0) & 0x80) > 0;
          var headerLength = isTwoByte ? 11 : 10;

          //          console.log('isTwoByte: ' + isTwoByte);
          var lngDelta = buf.readUInt16LE(4) << (24 - subDivision.level.resolution);
          var latDelta = buf.readUInt16LE(6) << (24 - subDivision.level.resolution);


          var streamLength = isTwoByte ? buf.readUInt16LE(8) : buf.readUInt8(8);
          var elBuf = new Buffer(streamLength);
          fs.readSync(fd, elBuf, 0, streamLength, elementStart + headerLength);
          //console.log(streamLength);

          var bitstreamBaseLat = (buf[headerLength - 1] & 0xf0) >> 4;
          var bitstreamBaseLng = buf[headerLength - 1] & 0x0f;

          var bReader = new BitReader(elBuf);

          var lngNegative = null;
          var lngSignSame = bReader.nextBit();
          if (lngSignSame) {
            lngNegative = bReader.nextBit();
          }

          var latNegative = null;
          var latSignSame = bReader.nextBit();
          if (latSignSame) {
            latNegative = bReader.nextBit();
          }

          var lngBitNum = bitsInCoords(bitstreamBaseLng, lngSignSame, hasExtraBit);
          var latBitNum = bitsInCoords(bitstreamBaseLat, latSignSame, hasExtraBit);

          line.push([
            subDivision.center.mapLng + lngDelta,
            subDivision.center.mapLat + latDelta]);

          while ((bReader.bitCursor() + latBitNum + lngBitNum - 1) / 8 < streamLength) {

            lngDelta = readCoordinateHalf(bReader, lngBitNum, lngNegative, lngSignSame);
            latDelta = readCoordinateHalf(bReader, latBitNum, latNegative, latSignSame);

            line.push([
              line[line.length - 1][0] + (latDelta << (24 - subDivision.level.resolution)),
              line[line.length - 1][1] + (lngDelta << (24 - subDivision.level.resolution))
            ]);
          }
          
          var coords = line.map(function(val, idx) {
            return [(val[0] * constants.MAP_TO_DEG).toFixed(6) * 1, (val[1] * constants.MAP_TO_DEG).toFixed(6) * 1];
          });
          if (isLine) {
            shape.geometry.coordinates = coords;
          } else {
            shape.geometry.coordinates.push(coords);
            if (coords[0][0] != coords[coords.length - 1][0] || coords[0][1] != coords[coords.length - 1][1]) {
              coords.push(coords[0]);
            }
          }
          shapes.push(shape);
          elementStart += headerLength + streamLength;
        }
        //console.log(elementStart + ' vs ' + (info.end + rgnSegmentStart_File));
      }
    }
  }
  return shapes;
};
RgnFile.getShapes = getShapes;

module.exports = RgnFile;