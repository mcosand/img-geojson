function tile2long(x, z) {
  return (x / Math.pow(2, z) * 360 - 180);
}

function tile2lat(y, z) {
  var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

function xyz2bounds(x, y, z) {
  return { north: tile2lat(y, z), west: tile2long(x, z), south: tile2lat(y + 1, z), east: tile2long(x + 1, z) };
}

module.exports.xyz2bounds = xyz2bounds;
