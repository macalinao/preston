"use strict";

var express = require('express');
var queryHelper = require('./query');
var routes = require('./routes');
var utils = require('./utils');

module.exports = Model;

/**
 * Constructor.
 *
 * @param model - The mongoose model that is being restified.
 */
function Model(restifier, model) {
  this.restifier = restifier;
  this.model = model;

  // Special fields
  var id;
  var restricted = this.restricted = [];
  model.schema.eachPath(function(pathName, path) {
    if (path.options.restricted) {
      restricted.push(pathName);
    }
    if (path.options.id) {
      id = pathName;
    }
  });
  this.id = id || '_id';

  this.modifiers = [];
  this.filters = {};
  this.transformers = [];
  this.submodels = {};

  this.transform(function(req, doc) {
    restricted.filter(function(path) {
      delete doc[path];
    });
  });
}

/**
 * Modifies a query parameter.
 *
 * @param param - The param to modify
 * @paran fn(req, value) - The modifier function. Should return the new value.
 */
Model.prototype.modifyParam = function(param, fn) {
  this.modifiers.push({
    param: param,
    fn: fn
  });
  return this;
};

/**
 * Modifies the limit parameter.
 *
 * @param num - The maximum number of documents that can be returned.
 */
Model.prototype.limit = function(num) {
  return this.modifyParam('limit', function(req, value) {
    return value && !isNaN(value) ? Math.min(num, value) : num;
  });
};

/**
 * Adds a filter to this model.
 *
 * @param name - The name of the filter.
 * @param filter(req, query, params...) - The filter function that will be run on queries.
 */
Model.prototype.filter = function(name, filter) {
  this.filters[name] = filter;
  return this;
};

/**
 * Adds a transformer to this model.
 *
 * @param transformer(req, doc) - The transformer
 */
Model.prototype.transform = function(transformer) {
  this.transformers.push(transformer);
};

Model.prototype.applyTransforms = function(req, doc) {
  var jsoned = doc.toObject();
  this.transformers.filter(function(tf) {
    tf(req, jsoned);
  });
  return jsoned;
};

/**
 * Makes a field a submodel, meaning that field
 * has its own routes for query/crud.
 *
 * @param field - The field to submodel
 * @param correspondsTo - The submodel's field that corresponds to this model.
 * @param model - The mongoose model
 */
Model.prototype.submodel = function(field, correspondsTo, model) {
  // Check if valid
  if (this.parent) {
    throw new Error('Submodels of submodels not allowed for model "' + this.model.modelName + '".');
  }

  var submodel = this.submodels[field] = new Model(this.restifier, model);
  submodel.parent = this;
  submodel.parentField = field;
  submodel.parentCorrespondsTo = correspondsTo;
  return submodel;
};

/**
 * Serves this model on a RESTful API.
 * Don't use this method; use the middleware instead.
 *
 * @param router - The Express router to serve the model on.
 */
Model.prototype.serve = function(router) {
  var thiz = this;

  var baseModel = this.parent ? this.parent.model : this.model;
  var uriBase = '/' + baseModel.collection.name;
  var uriDoc = uriBase + '/:id';
  if (this.parent) {
    uriBase = uriDoc + '/' + this.parentField;
    uriDoc = uriBase + '/:sid';
  }

  var middleware = [queryHelper.queryParser, queryHelper.docFetcher(this)];

  router.route(uriBase)
    .get(middleware, routes.query(this))
    .post(middleware, routes.create(this));

  router.route(uriDoc)
    .get(middleware, routes.get(this))
    .put(middleware, routes.update(this))
    .patch(middleware, routes.update(this))
    .delete(middleware, routes.delete(this));

  return this;
};


/**
 * Creates a middleware of this model.
 */
Model.prototype.middleware = function() {
  var router = express.Router();
  this.serve(router);
  return router;
};
