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
 * @param model - The mongoose model
 */
Model.prototype.submodel = function(field, model) {
  // Check if valid
  if (this.parent) {
    throw new Error('Submodels of submodels not allowed for model "' + this.model.modelName + '".');
  }

  var path = this.model.schema.paths[field];
  if (!path) {
    throw new Error('Field "' + field + '" undefined for submodel of model "' + this.model.modelName + '".');
  }
  var type = path.options.type;
  if (!Array.isArray(type)) {
    throw new Error('Field "' + field + '" must be an array for submodel of model "' + this.model.modelName + '".');
  }
  if (type[0].ref !== model.modelName) {
    throw new Error('Field "' + field + '" has wrong ref for submodel of model "' + this.model.modelName + '".');
  }
  if (!type[0].correspondsTo) {
    throw new Error('Field "' + field + '" must have correspondsTo property set for submodel of model "' + this.model.modelName + '".');
  }

  var submodel = this.submodels[field] = new Model(this.restifier, model);
  submodel.parent = this;
  submodel.parentField = field;
  return submodel;
};

/**
 * Serves this model on a RESTful API.
 *
 * @param router - The Express router to serve the model on.
 */
Model.prototype.serve = function(router) {
  var thiz = this;
  var Mod = this.model;

  var baseModel = this.parent ? this.parent.model : this.model;
  var uriBase = '/' + baseModel.collection.name;
  var uriDoc = uriBase + '/:id';
  if (this.parent) {
    uriBase = uriDoc + '/' + this.parentField;
    uriDoc = uriBase + '/:sid';
  }

  router.route(uriBase)
    .get(routes.query(this, Mod))
    .post(routes.create(this, Mod));

  var docFetcher = function(req, res, next) {
    if (!req.params.id) {
      return next();
    }
    var query = {};
    var body = req.body;
    var idField = thiz.parent ? thiz.parent.id : thiz.id;
    query[idField] = req.params.id;

    var model = thiz.parent ? thiz.parent.model : thiz.model;
    model.findOne(query).exec(function(err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.error(404, model.modelName + ' "' + req.params.id + '" not found.');
      }

      if (!thiz.parent) {
        req.doc = doc;
        return next();
      }

      query = {};
      query[thiz.id] = req.params.sid;
      thiz.model.findOne(query).exec(function(err, sai) {
        if (err) {
          return next(err);
        }

        if (!doc) {
          return res.error(404, Mod.modelName + ' "' + req.params.id + '" not found.');
        }

        req.doc = sai; // get sai from sid
        return next();
      });
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
