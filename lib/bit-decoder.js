module.exports.read24Bit = function (buf, offset) {
  var val = (((((buf[offset + 2] << 8) + buf[offset + 1]) << 8) + buf[offset]) << 8);
  return val >> 8;
}

module.exports.readU24Bit = function (buf, offset) {
  return ((((buf[offset + 2] << 8) + buf[offset + 1]) << 8) + buf[offset]);
}