var assert = require('assert')
  , bits = require('../lib/bit-decoder.js')

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

function bin2decTest(bin, int) {
  assert.equal(int, bin.bin());
}

function dec2binTest(dec, bin) {
  var result = dec.bin();
  assert.equal(bin, result);
}

describe('number debugging', function(){
  describe('dec2bin', function() {
    it('3 -> binary', function() {
      dec2binTest(3,  '00000000000000000000000000000011');
    });
    it('-1 -> binary', function () {
      dec2binTest(-1, '11111111111111111111111111111111');
    });
  });
  describe('bin2dec', function() {
    it('binary -> -1', function () {
      bin2decTest('11111111 11111111 11111111 11111111', -1);
    });
    it('binary -> -2', function () {
      bin2decTest('11111111 11111111 11111111 11111110', -2);
    });
    it('binary -> 42', function () {
      bin2decTest('00000000 00000000 00000000 00101010', 42);
    });
    it('binary -> -243', function () {
      bin2decTest('11111111 11111111 11111111 00001101', -243);
    });
  });
});

describe('24 bit decoding', function () {
  describe('signed 24 bits', function () {
    it('small positive number', function () {
      buf = [5, 0, 0];
      assert.equal(5, bits.read24Bit(buf, 0));
    });
    it('large positive number', function () {
      buf = [0x83, 0x9e, 0x28];
      assert.equal(2662019, bits.read24Bit(buf, 0));
    });
    it('large negative number', function () {
      buf = [0x83, 0x9e, 0xa8];
      assert.equal(-5726589, bits.read24Bit(buf, 0));
    });
  });
  describe('unsigned 24 bits', function () {
    it('large number', function () {
      buf = [0x83, 0x9e, 0xa8];
      assert.equal(11050627, bits.readU24Bit(buf, 0));
    });
  });
});
