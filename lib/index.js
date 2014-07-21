"use strict";

var Model = require('./model');

module.exports = new Restifier();
module.exports.__resError = false;

function Restifier() {
  this.prefix = '';
}

Restifier.prototype.setup = function setup(app) {
  app.use(require('res-error'));
};

Restifier.prototype.model = function(mongooseModel) {
  return new Model(this, mongooseModel);
};
