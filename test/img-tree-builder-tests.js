var fs = require('fs')
  , assert = require('assert')
  , path = require('path')
  , builder = require('../lib/img-tree-builder.js')
  , constants = require('../lib/constants.js')

describe('IMG Tree Builder', function() {
  var imgPath = path.join(__dirname, 'data', '10206001.img');
  var built;
  before(function (done) {
    builder(imgPath)
      .then(function (imgInfo) {
        built = imgInfo;
        done();
      });
  });

  it('has the right title', function () {
    assert.equal('Washington', built.title);
  });

  it('has TRE information', function () {
    assert.notEqual(undefined, built.tre);
  });

  it('has the right number of levels', function () {
    assert.equal(4, built.tre.levels.length);
  });

  it('has the right number of subdivisions', function () {
    assert.equal(1, built.tre.levels[0].subdivisions.length);
    assert.equal(223, built.tre.levels[1].subdivisions.length);
    assert.equal(852, built.tre.levels[2].subdivisions.length);
    assert.equal(5385, built.tre.levels[3].subdivisions.length);
  });
});