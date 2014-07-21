"use strict";

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

  // Restricted fields
  var restricted = this.restricted = [];
  model.schema.eachPath(function(pathName, path) {
    if (path.options.restricted) {
      restricted.push(pathName);
    }
  });

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

/**
 * Serves this model on a RESTful API.
 *
 * @param app - The Express app to serve the model on.
 */
Model.prototype.serve = function(app) {
  var thiz = this;
  var model = this.model;

  var uriBase = '/' + model.collection.name;

  app.get(this.restifier.prefix + uriBase, function(req, res) {
    var query = model.find();
    var reqQuery = req.query;

    Object.keys(reqQuery).map(function(param) {
      if (reqQuery[param] === '') {
        reqQuery[param] = null;
      }
    });

    // Apply modifiers
    thiz.modifiers.filter(function(mod) {
      reqQuery[mod.param] = mod.fn(req, reqQuery[mod.param]);
      if (reqQuery[mod.param] === false) {
        delete reqQuery[mod.param];
      }
    });

    // Apply limit parameter
    if (reqQuery.limit) {
      try {
        if (isNaN(reqQuery.limit)) {
          throw res.error(400, 'Limit must be a number.');
        }
        query.limit(reqQuery.limit);
      } catch (err) {
        if (!err.code) {
          throw err;
        }
        return;
      }
    }

    // Apply skip parameter
    if (reqQuery.skip) {
      query.skip(reqQuery.skip);
    }

    // Filters
    if (reqQuery.filter) {
      try {
        var filters = utils.parseFilterString(reqQuery.filter);
        filters.filter(function(filter) {
          if (!thiz.filters.hasOwnProperty(filter[0])) {
            throw res.error(400, 'The filter "' + filter + '" does not exist.');
          }
          var filterFn = thiz.filters[filter[0]];

          // Construct our filter arguments
          var args = [];
          args.push(req);
          args.push(query);
          args.push.apply(args, filter.slice(1));

          try {
            filterFn.apply(thiz, args);
          } catch (err) {
            throw res.error(400, 'Could not apply filter "' + filter + '" due to error: ' + err.message);
          }
        });
      } catch (err) {
        if (!err.code) {
          throw err;
        }
        return;
      }
    }

    // Fields
    try {
      model.schema.eachPath(function(name) {
        if (!reqQuery.hasOwnProperty(name)) {
          return;
        }
        var val = reqQuery[name];

        if (thiz.restricted.indexOf(name) !== -1) {
          throw res.error(401, 'Cannot access restricted field "' + name + '".');
        }
        query.where(name).equals(val);
      });
    } catch (err) {
      if (!err.code) {
        throw err;
      }
      return;
    }

    query.exec(function(err, docs) {
      if (err) {
        throw err;
      }
      var display = [];
      docs.filter(function(doc) {
        var jsoned = doc.toObject();
        thiz.transformers.filter(function(tf) {
          tf(req, jsoned);
        });
        display.push(jsoned);
      });
      res.json(display);
    });
  });

  return this;
};
