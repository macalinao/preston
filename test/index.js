'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var expect = require('chai').expect;
var http = require('http');
var mongoose = require('mongoose');
var request = require('supertest');
var restifier = require('..');

describe('rest', function() {
  var app, server, User, Post, rest;

  beforeEach(function(done) {
    rest = restifier.api().asFunction();

    // Some setup
    var conn = mongoose.createConnection('mongodb://localhost:27017/test');
    User = conn.model('User', new mongoose.Schema({
      name: {
        id: true,
        type: String
      },
      description: String
    }));

    Post = conn.model('Post', new mongoose.Schema({
      name: {
        id: true,
        type: String
      },
      contents: String
    }));

    var bob = new User({
      name: 'Bob',
      description: 'test'
    });
    app = express();
    app.use(bodyParser.json());

    bob.save(done);
  });

  describe('api reset', function() {
    it('should create a brand new api', function() {
      rest(User, Post);
      var models = rest.models;
      expect(models).to.eql(rest.models);
      expect(models).to.not.eql(restifier.api().models);
    });
  });

  describe('quick initialize', function() {
    it('should add the appropriate error handlers', function(done) {
      rest(User, Post);
      app.use(rest.middleware());

      request(app).get('/users/Bobb').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.body.message).to.match(/not found/);
        done();
      });
    });
  });

  describe('#middleware', function() {
    beforeEach(function() {
      rest(User, Post);
      app.use(rest.middleware());
    });

    it('should add the appropriate error handlers', function(done) {
      request(app).get('/users/Bobb').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.body.message).to.match(/not found/);
        done();
      });
    });
  });

  describe('405', function() {
    beforeEach(function() {
      rest(User, Post);
      app.use(rest.middleware());
    });

    it('should not allow PUT collection', function(done) {
      request(app).put('/users').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.status).to.equal(405);
        expect(res.body.message).to.match(/PUT/);
        done();
      });
    });

    it('should not allow PATCH collection', function(done) {
      request(app).patch('/users').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.status).to.equal(405);
        expect(res.body.message).to.match(/PATCH/);
        done();
      });
    });

    it('should not allow DELETE collection', function(done) {
      request(app).delete('/users').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.status).to.equal(405);
        expect(res.body.message).to.match(/DELETE/);
        done();
      });
    });

    it('should not allow POST doc', function(done) {
      request(app).post('/users/Bob').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.status).to.equal(405);
        expect(res.body.message).to.match(/POST/);
        done();
      });
    });
  });

  describe('404', function(done) {
    beforeEach(function() {
      rest(User, Post);
      app.use(rest.middleware());
    });

    it('should 404 if model is invalid', function(done) {
      request(app).get('/dnes').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.status).to.equal(404);
        expect(res.body.message).to.match(/Path not found/);
        done();
      });
    });

    it('should 404 if submodel is invalid', function(done) {
      request(app).get('/dnes/1/asdf').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.status).to.equal(404);
        expect(res.body.message).to.match(/Path not found/);
        done();
      });
    });
  });

  describe('middleware', function(done) {
    it('should apply middleware', function(done) {
      rest(User, Post);
      rest.use(function(req, res, next) {
        res.set('yolo', 'swag');
        return next();
      });
      rest.use('/asdf', function(req, res, next) {
        res.set('young', 'mani');
        return res.status(200).send({
          message: 'hello mundo'
        });
      });
      app.use(rest.middleware());

      request(app).get('/asdf').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.status).to.equal(200);
        expect(res.header.yolo).to.equal('swag');
        expect(res.header.young).to.equal('mani');
        expect(res.body.message).to.equal('hello mundo');
        done();
      });
    });
  });
});
