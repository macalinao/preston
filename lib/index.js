"use strict";

var Model = require('./model');

var models = []; // Stores our models

var restifier = module.exports = function(mongooseModel) {
  if (!mongooseModel) {
    return restifier.initialize();
  }
  var m = new Model(this, mongooseModel);
  models.push(m);
  return m;
};

/**
 * Initialization middleware.
 */
restifier.initialize = function() {
  return require('res-error')({
    log: false
  });
};
