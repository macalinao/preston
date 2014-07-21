"use strict";

var expect = require('chai').expect;
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var request = require('supertest');

var restifier = require('../lib/');
var setup = require('./setup');

describe('Model', function() {
  var app, conn, server, User, UserModel;

  beforeEach(function(done) {
    var ret = setup(done);
    app = ret.app;
    conn = ret.conn;
    server = ret.server;
    User = ret.User;
    UserModel = ret.UserModel;
  });

  it('should detect restricted fields in a schema', function() {
    expect(UserModel.restricted).to.eql(['password']);
  });

  describe('#serve', function() {
    describe('query', function() {
      it('should return all documents with query', function(done) {
        request(app).get('/users').end(function(err, res) {
          expect(err).to.be.null;
          expect(res.body.length).to.equal(5);
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
