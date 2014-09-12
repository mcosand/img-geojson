module.exports.DEG_TO_MAP = (1 << 24) / 360;
module.exports.MAP_TO_DEG = 1 / module.exports.DEG_TO_MAP;

module.exports.SHAPE_TYPES = {
  POINTS: 0x10,
  INDEXED_POINTS: 0x20,
  POLYLINES: 0x40,
  POLYGONS: 0x80
};