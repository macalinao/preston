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
  this.serveModel(router, uriBase, this.model);
  this.model.schema.eachPath(function(pathName, path) {
    var type = path.options.type;
    if (Array.isArray(type) && type[0].correspondsTo) {
      thiz.serveModel(router, uriBase + '/' + pathName,
        thiz.model.collection.conn.model(type[0].ref));
    }
  });
};

Model.prototype.serveModel = function(router, uriBase, Mod) {
  var thiz = this;
  var uriDoc = uriBase + '/:id';

  function parentObjectId(req, cb) {
    var query = {};
    var body = req.body;
    query[thiz.id] = req.params.id;
    thiz.model.findOne(query).exec(function(err, doc) {
      if (err) {
        return cb(err);
      }
      if (!doc) {
        return cb(null, null);
      }
      return cb(null, doc._id);
    });
  }

  router.route(uriBase)
  // Query
  .get(routes.query(this, Mod))

  // Create
  .post(function(req, res) {
    var doc = new Mod(req.body);
    doc.save(function(err) {
      if (err) {
        if (err.err.match(/duplicate key error/)) {
          return res.error(409, Mod.modelName + ' already exists.');
        }
        return res.error(500, err.message);
      }
      res.json(thiz.applyTransforms(req, doc));
    });
  });

  router.route(uriDoc)
  // Get
  .get(function(req, res) {
    var query = {};
    query[thiz.id] = req.params.id;
    Mod.findOne(query).exec(function(err, doc) {
      if (err) {
        return res.error(500, err.err);
      }
      if (!doc) {
        return res.error(404, Mod.modelName + ' "' + req.params.id + '" not found.');
      }
      res.json(thiz.applyTransforms(req, doc));
    });
  })

  // Update
  .put(function(req, res) {
    var query = {};
    var body = req.body;
    query[thiz.id] = req.params.id;
    Mod.findOne(query).exec(function(err, doc) {
      if (err) {
        return res.error(500, err.err);
      }
      if (!doc) {
        return res.error(404, Mod.modelName + ' "' + req.params.id + '" not found.');
      }
      for (var prop in body) {
        if (!body.hasOwnProperty(prop)) {
          continue;
        }
        doc[prop] = body[prop];
      }

      doc.save(function(err) {
        if (err) {
          return res.error(500, err);
        }
        return res.json(thiz.applyTransforms(req, doc));
      });
    });
  })

  // Delete
  .delete(function(req, res) {
    var query = {};
    query[thiz.id] = req.params.id;
    Mod.findOne(query).exec(function(err, doc) {
      if (err) {
        return res.error(500, err.err);
      }
      if (!doc) {
        return res.error(404, Mod.modelName + ' "' + req.params.id + '" not found.');
      }
      doc.remove(function(err) {
        if (err) {
          return res.error(500, err);
        }
        return res.json({
          success: true
        });
      });
    });
  });

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
