var gulp = require('gulp');
var deploy = require('gulp-gh-pages');
var shell = require('gulp-shell');

gulp.task('jsdoc', function() {
  return gulp.src('').pipe(shell([
    './node_modules/.bin/doxdox lib/ -t "Preston" -d "REST API Framework for Mongoose and Node" -o ./site/docs/index.html'
  ]));
});

gulp.task('site', ['jsdoc'], function() {
  return gulp.src('./site/**/*')
    .pipe(deploy());
});
