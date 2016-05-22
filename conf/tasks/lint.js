/*global __dirname,require*/
(function buildTask() {
  'use strict';

  const gulp = require('gulp')
      , eslint = require('gulp-eslint')
      , path = require('path')
      , paths = require('../paths')
      , toLint = path.resolve(__dirname, '../..', paths.lib, '**/*.js')
      , gulpFolder = path.resolve(__dirname, '**/*.js');

  gulp.task('lint', () => {

    return gulp.src([gulpFolder, toLint])
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failOnError());
  });

}());
