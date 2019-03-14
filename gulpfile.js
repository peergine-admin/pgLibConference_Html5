'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var log = require('gulplog');

gulp.task('javascript', function () {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: './src/pgLibConference.js',
    debug: false
  });

  b.bundle()
  .pipe(source('pgLibConference.js'))
  .pipe(buffer())
  // .pipe(sourcemaps.init({loadMaps: true}))
      // Add transformation tasks to the pipeline here.
      // .pipe(uglify())
      // .on('error', log.error)
  // .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./dist/'));

  var bmin = browserify({
    entries: './src/pgLibConference.js',
    debug: false
  });

  return bmin.bundle()
    .pipe(source('pgLibConference.min.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        .pipe(uglify())
        .on('error', log.error)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist/'));
});