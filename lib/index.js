"use strict";

var Model = require('./model');

module.exports = new Restifier();

function Restifier() {
  this.prefix = '';
}

Restifier.prototype.model = function(mongooseModel) {
  return new Model(this, mongooseModel);
};
