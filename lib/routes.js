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
  return function(req, res) {
    var query = Mod.find();
    var reqQuery = req.query;

    if (req.parentDoc) {
      query.where(model.parentCorrespondsTo).equals(req.parentDoc);
    }

    model.applyModifiers(req);

    try {
      queryHelper.applyQueryFields(req, query, model, res);
      if (reqQuery.populate) {
        queryHelper.applyPopulate(query, model, reqQuery.populate, res);
      }
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
      async.map(docs, function(doc, next) {
        model.applyTransforms(req, doc, next);
      }, function(e, jsoned) {
        res.json(jsoned);
      });
    });
  };
};

exports.create = function(model) {
  var Mod = model.model;
  return function(req, res) {
    var doc = new Mod(req.body);
    if (req.parentDoc) {
      doc[model.parentCorrespondsTo] = req.parentDoc;
    }
    doc.save(function(err) {
      if (err) {
        if (err.err && err.err.match(/duplicate key error/)) {
          return res.error(409, Mod.modelName + ' already exists.');
        }
        return res.error(500, err.message);
      }
      model.applyTransforms(req, doc, function(err, jsoned) {
        res.json(jsoned);
      });
    });
  };
};

exports.get = function(model) {
  return function(req, res) {
    model.applyTransforms(req, req.doc, function(err, jsoned) {
      res.json(jsoned);
    });
  };
};

exports.update = function(model) {
  return function(req, res) {
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
        return res.error(500, err);
      }
      model.applyTransforms(req, doc, function(err, jsoned) {
        res.json(jsoned);
      });
    });
  };
};

exports.destroy = function(model) {
  return function(req, res) {
    req.doc.remove(function(err) {
      if (err) {
        return res.error(500, err);
      }
      return res.json({
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
