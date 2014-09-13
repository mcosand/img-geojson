var fs = require('fs')
  , assert = require('assert')
  , path = require('path')
  , builder = require('../lib/img-tree-builder.js')
   ,Lookup = require('../lib/img-tre-lookup.js')

function countDivisions(divisions) {
  var count = 0;
  for (var i in divisions) {
    count += divisions[i].divisions.length;
  }
  return count;
}

describe('IMG Tree lookup', function () {
  var imgPath = path.join(__dirname, 'data', '10206001.img');
  var lookup = new Lookup();
  before(function (done) {
    builder(imgPath)
      .then(function (imgInfo) {
        lookup.push(imgInfo);
        done();
      });
  });

  it('finds intersection in top level', function () {
        var divisions = lookup.divisionsInBounds({ north: 47, west: -122, south: 45, east: -121 }, 0);
        assert.equal(1, countDivisions(divisions));
  });

  it('foo', function () {
    var divisions = lookup.divisionsInBounds({ north: 47, west: -122, south: 45, east: -121 }, 1);
    assert.equal(16, countDivisions(divisions));
  });
});