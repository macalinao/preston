'use strict';

var async = require('async');
var expect = require('chai').expect;
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var request = require('supertest');

var preston = require('..');
var setup = require('./setup');

describe('Model', function() {
  var app, conn, User, Comment;

  before(function() {
    conn = setup.models();
  });

  beforeEach(function(done) {
    var ret = setup.data(done);
    app = ret.app;
    User = ret.User;
    Comment = ret.Comment;
  });

  afterEach(function(done) {
    async.parallel([
      function(callback) {
        User.model.remove({}, callback);
      },
      function(callback) {
        Comment.model.remove({}, callback);
      }
    ], done);
  });

  after(function(done) {
    this.timeout(5000);
    conn.db.dropDatabase(function(err) {
      done(err);
    });
  });

  it('should detect restricted fields in a schema', function() {
    expect(User.restricted).to.eql(['password']);
  });

  describe('modifiers', function() {
    it('should synchronously modify params', function() {
      User.modifyParam('name', function(req, value) {
        return 'Tim';
      });
      User.applyModifiers({
        query: {}
      }, function(err, req) {
        expect(req.query.name).to.equal('Tim');
      });
    });

    it('should asynchronously modify params', function() {
      User.modifyParam('name', function(req, value, next) {
        async.times(1, function() {
          next(null, 'Tim');
        });
      });
      User.applyModifiers({
        query: {}
      }, function(err, req) {
        expect(req.query.name).to.equal('Tim');
      });
    });
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

    it('should synchronously ignore untransformable fields', function(done) {
      User.transformPopulate('age', function(req, doc) {
        doc.name = 'Tim';
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {
            age: 10
          };
        }
      }, function(err, doc) {
        expect(doc.age.name).to.be.undefined;
        done();
      });
    });

    it('should asynchronously ignore unpopulatable fields', function(done) {
      User.transformPopulate('age', function(req, doc, next) {
        async.times(1, function() {
          doc.name = 'Tim';
          next();
        });
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {
            age: 10
          };
        }
      }, function(err, doc) {
        expect(doc.age.name).to.be.undefined;
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

    it('should allow chaining population', function(done) {
      User.transformPopulate('friends', function(req, doc) {
        doc.name = 'Tim';
      }).transformPopulate('spouse', function(req, doc) {
        doc.name = 'Bob';
      }).transform(function(req, doc) {
        doc.name = 'Frank';
      }).transform(function(req, doc) {
        doc.age += 20;
      });
      User.applyTransforms(null, {
        toObject: function() {
          return {
            friends: [{}, {}, {}],
            spouse: {},
            age: 40
          };
        }
      }, function(err, doc) {
        expect(doc.name).to.equal('Frank');
        expect(doc.age).to.equal(60);
        expect(doc.friends[0].name).to.equal('Tim');
        expect(doc.friends.length).to.equal(3);
        expect(doc.spouse.name).to.equal('Bob');
        done();
      });
    });

  });

  describe('setupPreston static', function() {

    it('should call the setupPreston function', function(done) {
      Comment.applyTransforms(null, {
          toObject: function() {
            return {};
          }
        },
        function(err, doc) {
          expect(doc.modifiedWithinModel).to.be.true;
          done();
        });
    });

  });

});
