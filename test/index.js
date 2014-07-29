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

  describe('quick initialize', function() {
    it('should add the appropriate error handlers', function(done) {
      app.use(restifier());
      app.use(restifier(User, Post));
      app.use(restifier.finish());

      request(app).get('/users/Bobb').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.body.message).to.match(/not found/);
        done();
      });
    });
  });

  describe('405', function() {
    beforeEach(function() {
      app.use(restifier());
      app.use(restifier(User, Post));
      app.use(restifier.finish());
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
});
