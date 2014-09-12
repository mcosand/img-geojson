var BitReader = function (stream) {
  var _bitCursor = 0;

  this.bitCursor = function () {
    return _bitCursor;
  }

  this.nextBit = function nextBit() {
    var b = stream[Math.floor(_bitCursor / 8)];
    var mask = 1 << (_bitCursor % 8);
    var v = (b & mask) > 0;
    _bitCursor++;
    return v;
  }

  this.next = function next(count) {
    var tally = 0;
    for (var i = 0; i < count; i++) {
      tally |= ((this.nextBit() ? 1 : 0) << i) + tally;
    }
    return tally;
  }
};

module.exports = BitReader;