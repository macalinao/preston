var expect = require('chai').expect,
    mongooseRestifier = require('..');

describe('mongoose-restifier', function() {
  it('should say hello', function(done) {
    expect(mongooseRestifier()).to.equal('Hello, world');
    done();
  });
});
