"use strict";

var Model = require('./model');

module.exports = new Restifier();
module.exports.Restifier = Restifier;

function Restifier() {
  this.models = [];
}

Restifier.prototype.initialize = function() {
  return require('res-error')({
    log: false
  });
};

Restifier.prototype.model = function(mongooseModel) {
  var m = new Model(this, mongooseModel);
  this.models.push(m);
  return m;
};
