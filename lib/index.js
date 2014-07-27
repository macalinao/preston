"use strict";

var express =require('express');
var Model = require('./model');

var api = new RestAPI(); // Stores our models

var restifier = module.exports = function() {
  return api.setup.apply(api, Array.prototype.slice.call(arguments, 0));
};

/**
 * Resets the restifier API. You should typically not use this.
 */
restifier.reset = function() {
  api = new RestAPI();
};

function RestAPI() {
  this.initialized = false;
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
  if (this.initialized) {
    return function(req, res, next) {
      next();
    };
  }
  this.initialized = true;
  return require('res-error')({
    log: false
  });
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
