"use strict";

var express = require('express');
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
 * Serves this model on a RESTful API.
 *
 * @param router - The Express router to serve the model on.
 */
Model.prototype.serve = function(router) {
  var thiz = this;
  var uriBase = '/' + this.model.collection.name;
  var uriDoc = uriBase + '/:did';

  this.serveModel(router, uriBase, this.model);
  this.model.schema.eachPath(function(pathName, path) {
    var type = path.options.type;
    if (Array.isArray(type) && type[0].correspondsTo) {
      // thiz.serveModel(router, uriDoc + '/' + pathName, thiz.model.collection.conn.model(type[0].ref));
    }
  });
};

Model.prototype.serveModel = function(router, uriBase, Mod) {
  var thiz = this;
  var uriDoc = uriBase + '/:did';

  router.route(uriBase)
    .get(routes.query(this, Mod))
    .post(routes.create(this, Mod));

  var docFetcher = function(req, res, next) {
    if (!req.params.did) {
      return next();
    }
    var query = {};
    var body = req.body;
    query[thiz.id] = req.params.did;
    thiz.model.findOne(query).exec(function(err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.error(404, Mod.modelName + ' "' + req.params.did + '" not found.');
      }
      req.doc = doc;
      return next();
    });
  };

  router.route(uriDoc)
    .get(docFetcher, routes.get(this, Mod))
    .put(docFetcher, routes.update(this, Mod))
    .patch(docFetcher, routes.update(this, Mod))
    .delete(docFetcher, routes.delete(this, Mod));

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
