'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var expect = require('chai').expect;
var http = require('http');
var mongoose = require('mongoose');
var request = require('supertest');
var restifier = require('..');

describe('restifier', function() {
  var app, server, User, Post;

  before(function(done) {
    // Some setup
    mongoose.connect('mongodb://localhost:27017/test');
    User = mongoose.model('User', new mongoose.Schema({
      name: {
        id: true,
        type: String
      },
      description: String
    }));

    Post = mongoose.model('Post', new mongoose.Schema({
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

    bob.save(done);
  });

  beforeEach(function() {
    app = express();
    app.use(bodyParser.json());
  });

  describe('api reset', function() {
    it('should create a brand new api', function() {
      restifier(User, Post);
      var models = restifier.instance.models;
      expect(models).to.eql(restifier.instance.models);
      expect(models).to.not.eql(restifier.api().models);
    });
  });

  describe('quick initialize', function() {
    it('should add the appropriate error handlers', function(done) {
      restifier(User, Post);
      app.use(restifier.middleware());

      request(app).get('/users/Bobb').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.body.message).to.match(/not found/);
        done();
      });
    });
  });

  describe('#middleware', function() {
    beforeEach(function() {
      restifier(User, Post);
      app.use(restifier.middleware());
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
      restifier(User, Post);
      app.use(restifier.middleware());
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
      restifier(User, Post);
      app.use(restifier.middleware());
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
});
