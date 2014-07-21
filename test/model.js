"use strict";

var expect = require('chai').expect;
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var request = require('supertest');

var restifier = require('../lib/');
var setup = require('./setup');

describe('Model', function() {
  var app, conn, server, User;

  beforeEach(function(done) {
    var ret = setup(done);
    app = ret.app;
    conn = ret.conn;
    server = ret.server;
    User = ret.User;
  });

  it('should detect restricted fields in a schema', function() {
    expect(User.restricted).to.eql(['password']);
  });

  describe('query', function() {
    it('should return all documents with query', function(done) {
      request(app).get('/users').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.body.length).to.equal(5);
        done();
      });
    });

    it('should return a specific document when a param is given', function(done) {
      request(app).get('/users').query({
        name: 'Bob'
      }).end(function(err, res) {
        expect(err).to.be.null;
        expect(res.body.length).to.equal(1);
        expect(res.body[0].name).to.equal('Bob');
        done();
      });
    });

    it('should not return restricted fields', function(done) {
      request(app).get('/users').query({
        name: 'Bob'
      }).end(function(err, res) {
        expect(err).to.be.null;
        expect(res.body[0].password).to.be.undefined;
        done();
      });
    });

    it('should prevent searching for restricted fields', function(done) {
      request(app).get('/users')
        .query({
          password: 'hunter2'
        }).end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(401);
          expect(res.body.message).to.match(/Cannot access restricted field/);
          done();
        });
    });

    it('should allow searching for null fields', function(done) {
      request(app).get('/users')
        .query({
          hobby: null
        }).end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(1);
          done();
        });
    });

    describe('filters', function() {
      it('should error if a filter does not exist', function(done) {
        request(app).get('/users')
          .query({
            filter: 'dne'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(400);
            expect(res.body.message).to.match(/does not exist/);
            done();
          });
      });

      it('should error if a filter throws an error', function(done) {
        User.filter('custom', function(req, query) {
          throw new Error('This is an error');
        });
        request(app).get('/users')
          .query({
            filter: 'custom'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(400);
            expect(res.body.message).to.match(/This is an error/);
            done();
          });
      });

      it('should properly add to the query', function(done) {
        User.filter('losers', function(req, query) {
          query.where('hobby').equals(null);
        });
        request(app).get('/users')
          .query({
            filter: 'losers'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(1);
            expect(res.body[0].name).to.equal('Tim');
            done();
          });
      });

      it('should support multiple arguments', function(done) {
        User.filter('losers', function(req, query, field) {
          query.where(field).equals(null);
        });
        request(app).get('/users')
          .query({
            filter: 'losers hobby'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(1);
            expect(res.body[0].name).to.equal('Tim');
            done();
          });
      });

      it('should support chaining', function(done) {
        User.filter('threeletters', function(req, query, field) {
          query.where(field).regex(/^[a-zA-Z]{3}$/);
        });
        User.filter('winners', function(req, query, field) {
          query.where(field).ne(null);
        });
        request(app).get('/users')
          .query({
            filter: 'threeletters name | winners hobby'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(1);
            expect(res.body[0].name).to.equal('Bob');
            done();
          });
      });

    });

    describe('limit', function() {
      it('should limit returned doc count if limit is lower than collection size', function(done) {
        request(app).get('/users')
          .query({
            limit: 4
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(4);
            done();
          });
      });

      it('should return all docs if limit is higher than collection size', function(done) {
        request(app).get('/users')
          .query({
            limit: 6
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(5);
            done();
          });
      });

      it('should return all docs if limit is equal to collection size', function(done) {
        request(app).get('/users')
          .query({
            limit: 5
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(5);
            done();
          });
      });

      it('should limit docs if specified in the model', function(done) {
        User.limit(4);
        request(app).get('/users')
          .query().end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(4);
            done();
          });
      });

      it('model limit should override query limit', function(done) {
        User.limit(4);
        request(app).get('/users')
          .query({
            limit: 6
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(4);
            done();
          });
      });

      it('model limit should not be applied if given limit is lower', function(done) {
        User.limit(4);
        request(app).get('/users')
          .query({
            limit: 2
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(2);
            done();
          });
      });

      it('model limit should override NaN limits', function(done) {
        User.limit(4);
        request(app).get('/users')
          .query({
            limit: 'NaN'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(4);
            done();
          });
      });

      it('should error if limit is not a number', function(done) {
        request(app).get('/users')
          .query({
            limit: 'NaN'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(400);
            expect(res.body.message).to.match(/Limit must be a number/);
            done();
          });
      });
    });

    describe('skip', function() {
      it('should skip over the number of documents given', function(done) {
        request(app).get('/users')
          .query({
            skip: 2
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(3);
            done();
          });
      });

      it('should error if skip is not a number', function(done) {
        request(app).get('/users')
          .query({
            skip: 'NaN'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(400);
            expect(res.body.message).to.match(/Skip must be a number/);
            done();
          });
      });
    });

    describe('populate', function() {
      it('should error if the field does not exist', function(done) {
        request(app).get('/users')
          .query({
            populate: 'dne'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(400);
            expect(res.body.message).to.match(/does not exist/);
            done();
          });
      });

      it('should populate a field', function(done) {
        request(app).get('/users')
          .query({
            populate: 'comments'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body[0].comments.length).to.equal(3);
            done();
          });
      });
    });

    describe('modifiers', function() {
      it('should change the parameter', function(done) {
        User.modifyParam('name', function(req, value) {
          return 'Tim';
        });
        request(app).get('/users')
          .query({
            name: 'Bob'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body[0].name).to.equal('Tim');
            done();
          });
      });

      it('should delete a parameter if it returns false', function(done) {
        User.modifyParam('name', function(req, value) {
          return false;
        });
        request(app).get('/users')
          .query({
            name: 'Bob'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(5);
            done();
          });
      });

      it('should not delete the parameter if null', function(done) {
        User.modifyParam('name', function(req, value) {
          return null;
        });
        request(app).get('/users')
          .query({
            name: 'Bob'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(0);
            done();
          });
      });
    });

    describe('transformers', function() {
      it('should be applied to all docs', function(done) {
        User.transform(function(req, doc) {
          delete doc._id;
        });

        request(app).get('/users')
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.length).to.equal(5);
            res.body.filter(function(item) {
              expect(item._id).to.be.undefined;
              expect(item.name).to.not.be.null;
            });
            done();
          });
      });
    });
  });

  afterEach(function(done) {
    server.close();
    conn.db.dropDatabase(function(err) {
      done(err);
    });
  });
});
