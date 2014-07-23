"use strict";

var Model = require('./model');

module.exports = new Restifier();
module.exports.Restifier = Restifier;

function Restifier() {
  this.prefix = '';
}

Restifier.prototype.initialize = function() {
  return require('res-error')({
    log: false
  });
};

Restifier.prototype.model = function(mongooseModel) {
  return new Model(this, mongooseModel);
};
