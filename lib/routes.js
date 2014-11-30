'use strict';

var _ = require('lodash');
var async = require('async');
var queryHelper = require('./query');
var utils = require('./utils');

/**
 * The query route.
 *
 * @param {Model} model - The {@link Model}.
 * @returns {Function} A middleware corresponding to this route.
 */
exports.query = function(model) {
  var Mod = model.model;
  return function(req, res, next) {
    var query = Mod.find();
    var reqQuery = req.query;

    if (req.parentDoc) {
      query.where(model.parentCorrespondsTo).equals(req.parentDoc);
    }

    model.applyModifiers(req, function(err, request) {
      req = request;
      try {
        queryHelper.applyQueryFields(req, query, model, res);
        if (reqQuery.populate) {
          queryHelper.applyPopulate(query, model, reqQuery.populate, res);
        }
      } catch (err) {
        if (!err.code) {
          return next(err);
        }
        return;
      }

      query.exec(function(err, docs) {
        if (err) {
          return next(err);
        }
        async.map(docs, function(doc, next) {
          model.applyTransforms(req, doc, next);
        }, function(e, jsoned) {
          res.json(jsoned);
          if (e) {
            next(e);
          }
        });
      });
    });
  };
};

exports.create = function(model) {
  var Mod = model.model;
  return function(req, res, next) {
    var doc = new Mod(req.body);
    if (req.parentDoc) {
      doc[model.parentCorrespondsTo] = req.parentDoc;
    }
    doc.save(function(err) {
      if (err) {
        if (err.err && err.err.match(/duplicate key error/)) {
          res.error(409, Mod.modelName + ' already exists.');
          return next(err);
        }
        res.error(500, err.message);
        return next(err);
      }
      model.applyTransforms(req, doc, function(err, jsoned) {
        res.json(jsoned);
        if (err) {
          next(err);
        }
      });
    });
  };
};

exports.get = function(model) {
  return function(req, res, next) {
    model.applyTransforms(req, req.doc, function(err, jsoned) {
      res.json(jsoned);
      if (err) {
        next(err);
      }
    });
  };
};

exports.update = function(model) {
  return function(req, res, next) {
    var doc = req.doc;
    var body = req.body;
    for (var prop in body) {
      if (!_.has(body, prop)) {
        continue;
      }
      doc[prop] = body[prop];
    }

    doc.save(function(err) {
      if (err) {
        res.error(500, err);
        return next(err);
      }
      model.applyTransforms(req, doc, function(err, jsoned) {
        res.json(jsoned);
        next(err);
      });
    });
  };
};

exports.destroy = function(model) {
  return function(req, res, next) {
    req.doc.remove(function(err) {
      if (err) {
        res.error(500, err);
        return next(err);
      }
      res.json({
        success: true
      });
    });
  };
};

/**
 * The default route that will be called if nothing else is.
 */
exports.default = function(req, res, next) {
  return res.error(405, req.method + ' not allowed on path ' + req.path + '.');
};
