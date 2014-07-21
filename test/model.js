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

    describe('modifiers', function() {
      it('should change the parameter', function(done) {
        UserModel.modifyParam('name', function(req, value) {
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
        UserModel.modifyParam('name', function(req, value) {
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
    });
  });

  afterEach(function(done) {
    server.close();
    conn.db.dropDatabase(function(err) {
      done(err);
    });
  });
});
