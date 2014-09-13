var assert = require('assert')
  , intersects = require('../lib/intersects.js')

describe('Intersection Tests', function () {
  describe('wholly inside', function () {
    it('+ + quadrant', function () {
      assert.equal(true, intersects(
        { north: 4, west: 2, south: 2, east: 4 },
        { north: 6, west: 0, south: 0, east: 6 }));
    });

    it('- + quadrant', function () {
      assert.equal(true, intersects(
        { north: 4, west: -4, south: 2, east: -2 },
        { north: 6, west: -6, south: 0, east: 0 }));
    });
  });

  describe('wholly outside', function () {
    it('+ + quadrant', function () {
      assert.equal(true, intersects(
        { north: 6, west: 0, south: 0, east: 6 },
        { north: 4, west: 2, south: 2, east: 4 }));
    });

    it('- + quadrant', function () {
      assert.equal(true, intersects(
        { north: 6, west: -6, south: 0, east: 0 },
        { north: 4, west: -4, south: 2, east: -2 }));
    });
  });
});
