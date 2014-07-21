"use strict";

var expect = require('chai').expect;
var utils = require('../lib/utils');

describe('utils', function() {
  describe('parseFilterString', function() {
    it('should break up a filter string into parts', function() {
      var res = utils.parseFilterString('find a | destroy b | kill');
      expect(res).to.eql([
        ['find', 'a'],
        ['destroy', 'b'],
        ['kill']
      ]);
    });
    
    it('should tolerate double quotes', function() {
      var res = utils.parseFilterString('find "a license to kill" | destroy b | kill');
      expect(res).to.eql([
        ['find', 'a license to kill'],
        ['destroy', 'b'],
        ['kill']
      ]);
    });
    
    it('should tolerate single quotes', function() {
      var res = utils.parseFilterString("find 'a license to kill' | destroy b | kill");
      expect(res).to.eql([
        ['find', 'a license to kill'],
        ['destroy', 'b'],
        ['kill']
      ]);
    });

    it('should not remove heterogenous quotes', function() {
      var res = utils.parseFilterString("find 'a license to kill\" | destroy b | kill");
      expect(res).to.eql([
        ['find', '\'a license to kill"'],
        ['destroy', 'b'],
        ['kill']
      ]);
    });
  });
});
