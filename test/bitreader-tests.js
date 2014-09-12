var assert = require('assert')
  , BitReader = require('../lib/bitreader.js')

String.prototype.bin = function () {
  var result = parseInt(this.replace(/ /g, ''), 2);
  return (this[0] == '1') ? (-0x100000000 + result) : result;
}

Number.prototype.bin = function () { 
  var shifted = this
    , result = '';

  for (var flag = 0; flag < 32; flag++) {
    result += String(shifted >>> 31);
    shifted <<= 1;
  }
  return result;
}

describe('BitReader', function () {
  describe('nextBit', function () {
    it('reads in the right order', function () {
      var stream = [0x05, 0x46];
      var bits = new BitReader(stream);
      assert.equal(true, bits.nextBit());
      assert.equal(false, bits.nextBit());
      assert.equal(true, bits.nextBit());
      for (var i = 0; i < 5; i++) assert.equal(false, bits.nextBit());
      assert.equal(false, bits.nextBit());
      assert.equal(true, bits.nextBit());
      assert.equal(true, bits.nextBit());
      assert.equal(false, bits.nextBit());
    });
  });
  describe('next', function () {
    it('reads with correct endian', function () {
      var stream = [0x05];
      var bits = new BitReader(stream);
      assert.equal(5, bits.next(6));
    });
  });
});
