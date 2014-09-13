var assert = require('assert')
  , tilecalc = require('../lib/tile-calc.js')

describe('Tile Calculator', function () {
  describe('getBounds', function () {
    it('sample', function () {
      var bounds = tilecalc.xyz2bounds(650, 1432, 12);

      assert.equal(-122.871094, bounds.west.toFixed(6));
      assert.equal(47.457809, bounds.south.toFixed(6));
      assert.equal(-122.783203, bounds.east.toFixed(6));
      assert.equal(47.517201, bounds.north.toFixed(6));
    });
  });
});
