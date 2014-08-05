'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var utils = require('./utils');

exports.queryParser = function(req, res, next) {
  var qp = req.query;
  // Parse the query
  // Ensure empty params are treated as null
  Object.keys(qp).map(function(param) {
    if (qp[param] === '') {
      qp[param] = null;
    }
  });

  // Parse comma-delimited params and trim them
  if (qp.populate) {
    qp.populate = qp.populate.split(',');
    qp.populate = qp.populate.map(Function.prototype.call, String.prototype.trim);
  }
  if (qp.sort) {
    qp.sort = qp.sort.split(',');
    qp.sort = qp.sort.map(Function.prototype.call, String.prototype.trim);
    var newVal = {};
    qp.sort.map(function(param) {
      if (param.lastIndexOf('-', 0) === 0) {
        newVal[param.substring(1)] = -1;
      } else {
        newVal[param] = 1;
      }
    });
    qp.sort = newVal;
  }
  next();
};

exports.docFetcher = function(thiz) {
  return function(req, res, next) {
    if (!req.params.id) {
      return next();
    }
    var query = {};
    var idField = thiz.parent ? thiz.parent.id : thiz.id;
    query[idField] = req.params.id;

    var model = thiz.parent ? thiz.parent.model : thiz.model;
    var q = model.findOne(query);
    // Apply population if no parent
    if (!thiz.parent && req.query.populate) {
      try {
        exports.applyPopulate(q, thiz, req.query.populate, res);
      } catch (e) {
        if (!e.code) {
          throw e;
        }
        return e;
      }
    }
    q.exec(function(err, doc) {
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
      req.parentDoc = doc;

      if (!req.params.sid) {
        return next();
      }

      query = {};
      query[thiz.id] = req.params.sid;
      query[thiz.parentCorrespondsTo] = doc._id;

      var q = thiz.model.findOne(query);
      // Apply population if parent
      if (req.query.populate) {
        exports.applyPopulate(q, thiz.model, req.query.populate, res);
      }
      q.exec(function(err, sai) {
        if (err) {
          return next(err);
        }

        if (!sai) {
          return res.error(404, thiz.model.modelName + ' "' + req.params.sid + '" not found.');
        }

        req.doc = sai; // get sai from sid
        return next();
      });
    });
  };
};

exports.applyModifiers = function(model, req) {
  // Apply modifiers
  // The try/catch allows us to throw errors in modifiers, if we're
  // doing something like auth.
  try {
    model.modifiers.filter(function(mod) {
      req.query[mod.param] = mod.fn(req, req.query[mod.param]);
      if (req.query[mod.param] === false) {
        delete req.query[mod.param];
      }
    });
  } catch (err) {
    if (!err.code) {
      throw err;
    }
    return;
  }
};

exports.applyQueryFields = function(req, query, model, res) {
  var Mod = model.model;

  // Limit
  if (req.query.limit) {
    if (isNaN(req.query.limit)) {
      throw res.error(400, 'Limit must be a number.');
    }
    query.limit(req.query.limit);
  }

  // Skip
  if (req.query.skip) {
    if (isNaN(req.query.skip)) {
      throw res.error(400, 'Skip must be a number.');
    }
    query.skip(req.query.skip);
  }

  // Sort
  if (req.query.sort) {
    Object.keys(req.query.sort).filter(function(toSort) {
      if (!Mod.schema.paths.hasOwnProperty(toSort)) {
        throw res.error(400, 'Field "' + toSort + '" does not exist.');
      }
      if (model.restricted.indexOf(toSort) !== -1) {
        throw res.error(401, 'Cannot sort restricted field "' + toSort + '".');
      }
    });
    query.sort(req.query.sort);
  }

  // Fields
  Mod.schema.eachPath(function(name) {
    if (!req.query.hasOwnProperty(name)) {
      return;
    }
    var val = req.query[name];

    if (model.restricted.indexOf(name) !== -1) {
      throw res.error(401, 'Cannot access restricted field "' + name + '".');
    }
    query.where(name).equals(val);
  });

  // Filters
  if (req.query.filter) {
    var filters = utils.parseFilterString(req.query.filter);
    filters.filter(function(filter) {
      if (!model.filters.hasOwnProperty(filter[0])) {
        throw res.error(400, 'The filter "' + filter + '" does not exist.');
      }
      var filterFn = model.filters[filter[0]];

      // Construct our filter arguments
      var args = [];
      args.push(req);
      args.push(query);
      args.push.apply(args, filter.slice(1));

      try {
        filterFn.apply(model, args);
      } catch (err) {
        throw res.error(400, 'Could not apply filter "' + filter + '" due to error: ' + err.message);
      }
    });
  }
};

exports.applyPopulate = function(query, model, populate, res) {
  var Mod = model.model;
  _.forEach(populate, function(toPopulate) {
      if (!Mod.schema.paths.hasOwnProperty(toPopulate)) {
        throw res.error(400, 'Field "' + toPopulate + '" does not exist.');
      }

      var type = Mod.schema.paths[toPopulate].options.type;
      if (type[0]) {
        type = type[0].type;
      }

      if (type !== mongoose.Schema.Types.ObjectId) {
        throw res.error(400, 'Field "' + toPopulate + '" does not support population as it is not an ObjectId.');
      }

    if (model.restricted.indexOf(toPopulate) !== -1) {
      throw res.error(401, 'Cannot populate restricted field "' + toPopulate + '".');
    }
    query.populate(toPopulate);
  });
};
