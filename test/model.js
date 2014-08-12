'use strict';

var async = require('async');
var expect = require('chai').expect;
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var request = require('supertest');

var restifier = require('../lib/');
var setup = require('./setup');

describe('Model', function() {
  var app, conn, User, Comment;

  beforeEach(function(done) {
    var ret = setup(done);
    app = ret.app;
    conn = ret.conn;
    User = ret.User;
    Comment = ret.Comment;
  });

  afterEach(function(done) {
    conn.db.dropDatabase(function(err) {
      done(err);
    });
  });

  it('should detect restricted fields in a schema', function() {
    expect(User.restricted).to.eql(['password']);
  });

  describe('transforms', function() {
    it('should synchronously transform the document', function(done) {
      User.transform(function(req, doc) {
        doc.asdf = 'asdf';
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {};
        }
      }, function(err, doc) {
        expect(doc.asdf).to.equal('asdf');
        done();
      });
    });

    it('should asynchronously transform the document', function(done) {
      User.transform(function(req, doc, next) {
        async.times(1, function() {
          doc.asdf = 'asdf';
          next();
        });
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {};
        }
      }, function(err, doc) {
        expect(doc.asdf).to.equal('asdf');
        done();
      });
    });

    it('should synchronously populate-transform a document', function(done) {
      User.transformPopulate('spouse', function(req, doc) {
        doc.name = 'Tim';
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {
            spouse: {}
          };
        }
      }, function(err, doc) {
        expect(doc.spouse.name).to.equal('Tim');
        done();
      });
    });

    it('should asynchronously populate-transform a document', function(done) {
      User.transformPopulate('spouse', function(req, doc, next) {
        async.times(1, function() {
          doc.name = 'Tim';
          next();
        });
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {
            spouse: {}
          };
        }
      }, function(err, doc) {
        expect(doc.spouse.name).to.equal('Tim');
        done();
      });
    });

    it('should synchronously populate-transform a document array', function(done) {
      User.transformPopulate('friends', function(req, doc) {
        doc.name = 'Tim';
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {
            friends: [{}, {}, {}]
          };
        }
      }, function(err, doc) {
        expect(doc.friends[0].name).to.equal('Tim');
        done();
      });
    });

    it('should asynchronously populate-transform a document array', function(done) {
      User.transformPopulate('friends', function(req, doc, next) {
        async.times(1, function() {
          doc.name = 'Tim';
          next();
        });
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {
            friends: [{}, {}, {}]
          };
        }
      }, function(err, doc) {
        expect(doc.friends[0].name).to.equal('Tim');
        done();
      });
    });

    it('should not transform a non-existent field', function(done) {
      User.transformPopulate('dne', function(req, doc) {
        doc.asdf = 'asdf';
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {};
        }
      }, function(err, doc) {
        expect(doc.asdf).to.be.undefined;
        done();
      });
    });

  });
});
