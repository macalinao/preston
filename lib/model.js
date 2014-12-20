'use strict';

var _ = require('lodash');
var async = require('async');
var express = require('express');
var queryHelper = require('./query');
var routes = require('./routes');
var utils = require('./utils');

module.exports = Model;

/**
 * Constructor.
 *
 * @see RestAPI#model
 *
 * @class
 * @param {RestAPI} restifier - The RestAPI instance
 * @param {mongoose.Model} model - The mongoose model that is being restified.
 */
function Model(restifier, model) {
  var thiz = this;

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
  this.middlewares = {};

  // Remove restricted
  this.transform(function(req, doc) {
    _.forEach(restricted, function(path) {
      delete doc[path];
    });
  });

  // Add id field
  this.transform(function(req, doc) {
    doc.id = doc[thiz.id];
  });

  // Call setupPreston static if exists
  var setup = model.schema.statics.setupPreston;
  if (setup) {
    setup.call(model.schema, this);
  }
}

/**
 * Modifies a query parameter. Modifiers alter the query parameters that will
 * be passed to the pipeline. Modifiers are applied before any logic is called.
 * To modify a parameter, pass the name of the parameter you wish to modify and
 * a callback that returns the modified value of the parameter.
 *
 * @example
 * // A modifier that forces sorting by name ascending
 * model.modifyParam('sort', function(req, value) {
 *   value.name = 1;
 *   return value;
 * });
 *
 * @param {String} param - The param to modify. Can be limit, skip, populate, sort,
 *   any document field, or a parameter handled by a custom middleware.
 * @param {Function} modifier - The modifier(req, value[, cb]) function. Should return the new value.
 * @returns {Model} The instance of this model
 */
Model.prototype.modifyParam = function(param, modifier) {
  this.modifiers.push({
    param: param,
    fn: modifier
  });
  return this;
};

/**
 * Applies the modifiers of this model onto a request.
 *
 * @param {Request} request - The request
 */
Model.prototype.applyModifiers = function(request, done) {
  function applyModifier(req, mod, next) {
    var modFn = mod.fn;
    var val = req.query[mod.param];

    // Sync
    if (modFn.length === 2) {
      try {
        var ret = modFn(req, val);
        if (ret === false) {
          delete req.query[mod.param];
        } else {
          req.query[mod.param] = ret;
        }
      } catch (err) {
        return next(err, null);
      }
      return next(null, req);
    }

    // Async
    modFn(req, val, function(err, ret) {
      if (ret === false) {
        delete req.query[mod.param];
      } else {
        req.query[mod.param] = ret;
      }
      return next(err, req);
    });
  }

  async.reduce(this.modifiers, request, applyModifier, done);
};
/**
 * Modifies the limit parameter. Internally, this applies a {@link modifyParam} that restricts
 * the limit parameter to be no greater than what is given here.
 *
 * @example
 * model.limit(5); // Now only 5 documents can be returned max
 *
 * // GET /model?limit=4 - Returns 4 documents
 * // GET /model?limit=5 - Returns 5 documents
 * // GET /model?limit=6 - Returns 5 documents
 *
 * @param {Number} num - The maximum number of documents that can be returned.
 * @returns {Model} The instance of this model
 */
Model.prototype.limit = function(num) {
  return this.modifyParam('limit', function(req, value) {
    return (value && !isNaN(value)) ? Math.min(num, value) : num;
  });
};

/**
 * Adds a filter to this model. Filters are user-defined functions that modify the
 * query. They work very similarly to AngularJS filters. They can be chained and
 * take parameters, allowing immense flexibility for developers to add features to APIs.
 *
 * Filters are called like this:
 * ```
 * GET /people?filter=children
 * ```
 *
 * They can also be chained like this:
 * ```
 * GET /people?filter=children | proximity 5
 * ```
 *
 * @example
 * // A simple filter
 * model.filter('children', function(req, query) {
 *   query.where('age').lt(18);
 * });
 *
 * // A filter that takes parameters:
 * model.filter('proximity', function(req, query, distance) {
 *   query.where('location').maxDistance(distance);
 * });
 *
 * @param {String} name - The name of the filter (case sensitive).
 * @param {Function} filter - The filter function (req, query, params...) that will be applied to queries.
 */
Model.prototype.filter = function(name, filter) {
  this.filters[name] = filter;
  return this;
};

/**
 * Adds a transformer to this model. Transformers change the returned results.
 * One transformer is built in, the restricted transformer, and cannot be changed.
 *
 * @example
 * model.transform(function(req, doc) {
 *   delete doc._id;
 *   delete doc.password;
 *   doc.type = 'This is a string that isn\'t in the database!';
 * });
 *
 * @param {Function} transformer - The transformer(req, doc[, next]).
 * @returns {Model} The instance of this model
 */
Model.prototype.transform = function(transformer) {
  this.transformers.push(transformer);
  return this;
};

/**
 * Adds a population transformer to this model. Population transformers are
 * transformers that operate on populated fields. They can be used to make
 * your application more secure by removing fields you don't want people to see.
 *
 * @example
 * model.transformPopulate('owners', function(req, doc) {
 *   delete doc._id;
 *   delete doc.password;
 * });
 *
 * @param {String} field - The populated field to transform.
 * @param {Function} transformer - The transform function(req, doc[, next])
 * @returns {Model} The instance of this model
 */
Model.prototype.transformPopulate = function(field, transformer) {
  // Wrapper so we have the correct number of args
  function callTransform(req, doc, next) {
    var pop = doc[field];
    if (!pop) {
      return;
    }

    // Normalize
    var single = false;
    if (typeof pop === 'object' && !Array.isArray(pop)) {
      pop = [pop];
      single = true;
    }

    // Ensure array, as it isn't an object at this point
    if (!Array.isArray(pop)) {
      // fail silently. This may change in the future
      if (next) {
        return next();
      } else {
        return;
      }
    }

    // Loop through
    // Sync
    if (transformer.length === 2) {
      _.forEach(pop, function(subDoc) {
        transformer(req, subDoc);
      });
      return;
    }

    // Async
    async.map(pop, function(subDoc, done) {
      transformer(req, subDoc, function(err) {
        return done(err, subDoc);
      });
    }, function(err, result) {
      if (single) {
        result = result[0];
      }
      doc[field] = result;
      next();
    });
  }

  // Synchronous
  if (transformer.length === 2) {
    return this.transform(function(req, doc) {
      callTransform(req, doc);
    });
  }

  // Async
  return this.transform(function(req, doc, next) {
    callTransform(req, doc, next);
  });
};

/**
 * Applies all of the transforms defined on this model on a document.
 *
 * @param {Request} req - The request.
 * @param {Document} doc - The document to apply the transforms to.
 * @param {Function} [cb] - The cb(err, result) where result is the transformed document.
 * @returns {Object} The transformed document as a JavaScript object.
 */
Model.prototype.applyTransforms = function(req, doc, cb) {
  async.reduce(this.transformers, doc.toObject(), function(memo, tf, next) {
    if (tf.length === 2) {
      tf(req, memo);
      next(null, memo);
    } else {
      tf(req, memo, function(err) {
        return next(err, memo);
      });
    }
  }, function(err, result) {
    cb(err, result);
  });
};

/**
 * Uses a middleware on a certain route. These middlewares are called in the order that they are added
 * to this model.
 *
 * @param {String} route - The route. Can be one of all, query, create, get, update, destroy.
 * @param {Function} middleware - The middleware(req, res, next).
 * @returns {Model} The instance of this model
 */
Model.prototype.use = function(route, middleware) {
  route = route.toLowerCase();
  var arr = this.middlewares[route] || (this.middlewares[route] = []);
  arr.push(middleware);
  return this;
};

/**
 * Makes a field a submodel, meaning that field
 * has its own routes for query/crud.
 *
 * Note that you cannot create a submodel of a submodel.
 *
 * @param field - The field to submodel
 * @param correspondsTo - The submodel's field that corresponds to this model.
 * @param model - The mongoose model
 * @returns {Model} A model which is prefixed with this model's route.
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
 * Gets the URI bases of the model.
 */
Model.prototype.getUriBases = function() {
  var uriBase = '/' + (this.parent || this).model.collection.name;
  var uriDoc = uriBase + '/:id';
  if (this.parent) {
    uriBase = uriDoc + '/' + this.parentField;
    uriDoc = uriBase + '/:sid';
  }

  return {
    base: uriBase,
    doc: uriDoc
  };
};

/**
 * Serves this model on a RESTful API.
 * Don't use this method; use the middleware instead via {@link RestAPI#middleware}.
 *
 * @param {express.Router} router - The Express router to serve the model on.
 * @returns {Model} The instance of this model
 */
Model.prototype.serve = function(router) {
  var thiz = this;

  var bases = this.getUriBases();
  var uriBase = bases.base;
  var uriDoc = bases.doc;

  var middleware = [queryHelper.queryParser, queryHelper.docFetcher(this)];
  middleware = middleware.concat(this.middlewares.all || []); // 'all' middleware
  var routeMiddleware = {};
  ['query', 'create', 'get', 'update', 'destroy'].filter(function(route) {
    routeMiddleware[route] = middleware.slice()
      .concat(thiz.middlewares[route] || []);
  });

  router.route(uriBase)
    .get(routeMiddleware.query, routes.query(this))
    .post(routeMiddleware.create, routes.create(this))
    .all(routes.default);

  router.route(uriDoc)
    .get(routeMiddleware.get, routes.get(this))
    .put(routeMiddleware.update, routes.update(this))
    .patch(routeMiddleware.update, routes.update(this))
    .delete(routeMiddleware.destroy, routes.destroy(this))
    .all(routes.default);

  return this;
};

/**
 * Prints the routes corresponding to this model.
 */
Model.prototype.printRoutes = function() {
  var bases = this.getUriBases();
  var uriBase = bases.base;
  var uriDoc = bases.doc;

  console.log('GET', uriBase);
  console.log('POST', uriBase);
  console.log('GET', uriDoc);
  console.log('PUT', uriDoc);
  console.log('PATCH', uriDoc);
  console.log('DELETE', uriDoc);
};

/**
 * Creates a middleware of this model. It is preferable to use {@link RestAPI#middleware}
 * as that function provides the necessary error handling and invalid method middlewares.
 *
 * @returns {Middleware} The middleware corresponding to this model.
 */
Model.prototype.middleware = function() {
  var router = express.Router();
  this.serve(router);
  return router;
};
