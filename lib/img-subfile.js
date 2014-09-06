var decoder = require('./bit-decoder.js');

function readCommonHeader(buf, target) {
  target.isLocked = buf[0x0d] != 0;
  target.created = new Date(
    buf.readUInt16LE(0xE),
    buf[0x10],
    buf[0x11],
    buf[0x12],
    buf[0x13],
    buf[0x14]);
}

module.exports.readCommonHeader = readCommonHeader;