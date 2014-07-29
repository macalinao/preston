'use strict';

var express = require('express');
var Model = require('./model');

var api = new RestAPI(); // Stores our models

var restifier = module.exports = function() {
  return api.setup.apply(api, Array.prototype.slice.call(arguments, 0));
};

restifier.finish = function() {
  return api.finish();
};

/**
 * Factory function to create a new RestAPI.
 */
restifier.api = function() {
  return new RestAPI();
};

/**
 * Resets the restifier API. You should typically not use this.
 */
restifier.reset = function() {
  api = new RestAPI();
};

function RestAPI() {
  this.models = {};
}

RestAPI.prototype.setup = function() {
  if (arguments.length > 1) {
    var args = Array.prototype.slice.call(arguments, 0);
    return this.modelsMiddleware(args);
  }
  var mongooseModel = arguments[0];
  if (!mongooseModel) {
    return this.initialize();
  }
  return this.model(mongooseModel);
};

/**
 * Initialization middleware.
 */
RestAPI.prototype.initialize = function() {
  return require('res-error')({
    log: false
  });
};

/**
 * Should be called after the app has been created.
 */
RestAPI.prototype.finish = function() {
  var router = express.Router();
  router.use(function(req, res, next) {
    return res.error(405, req.method + ' not allowed on path ' + req.path + '.');
  });
  return router;
};

/**
 * Creates a middleware out of multiple models.
 *
 * @param models The mongoose models
 */
RestAPI.prototype.modelsMiddleware = function(models) {
  var api = this;
  var router = express.Router();
  models = models.map(function(mong) {
    api.model(mong).serve(router);
  });
  return router;
};

/**
 * Adds a model to RestAPI.prototype.
 *
 * @param mongooseModel The mongoose model
 */
RestAPI.prototype.model = function(mongooseModel) {
  var m = new Model(this, mongooseModel);
  this.models[mongooseModel.modelName] = m;
  return m;
};
