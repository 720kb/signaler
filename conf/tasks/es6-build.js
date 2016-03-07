/*global require*/
(function buildTask() {
  'use strict';

  const gulp = require('gulp')
    , runSequence = require('run-sequence')
    , plumber = require('gulp-plumber')
    , rollup = require('rollup').rollup
    , rollupBabel = require('rollup-plugin-babel')
    , rollupUglify = require('rollup-plugin-uglify')
    , babel = require('gulp-babel')
    , sourcemaps = require('gulp-sourcemaps')
    , paths = require('../paths');

  gulp.task('es6-build', ['annotate'], done => {

    runSequence(['es6-build-node', 'es6-build-frontend'],
      done);
  });

  gulp.task('es6-build-node', () => {

    return gulp.src(`${paths.lib}node/**/*.js`)
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(babel({
        'presets': [
          'es2015'
        ],
        'moduleIds': true
      }))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(`${paths.tmp}node`));
  });

  gulp.task('es6-build-frontend', () => {
    const toProcess = [
      rollup({
        'entry': `${paths.lib}frontend/signaler.js`,
        'plugins': [
          rollupBabel({
            'presets': [
              'es2015-rollup'
            ]
          })
        ]
      }),
      rollup({
        'entry': `${paths.lib}frontend/angular-signaler.js`,
        'plugins': [
          rollupBabel({
            'presets': [
              'es2015-rollup'
            ]
          })
        ]
      }),
      rollup({
        'entry': `${paths.lib}frontend/signaler.js`,
        'plugins': [
          rollupBabel({
            'presets': [
              'es2015-rollup'
            ]
          }),
          rollupUglify()
        ]
      }),
      rollup({
        'entry': `${paths.lib}frontend/angular-signaler.js`,
        'plugins': [
          rollupBabel({
            'presets': [
              'es2015-rollup'
            ]
          }),
          rollupUglify()
        ]
      })
    ];

    return Promise.all(toProcess).then(bundles => {

      if (bundles &&
        Array.isArray(bundles)) {

        bundles[0].write({
          'format': 'umd',
          'banner': paths.banner,
          'moduleId': 'signaler',
          'moduleName': 'signaler',
          'sourceMap': true,
          'dest': `${paths.tmp}frontend/signaler.js`
        });

        bundles[1].write({
          'format': 'umd',
          'banner': paths.banner,
          'moduleId': 'angular-signaler',
          'moduleName': 'angular-signaler',
          'sourceMap': true,
          'dest': `${paths.tmp}frontend/angular-signaler.js`
        });

        bundles[2].write({
          'format': 'umd',
          'banner': paths.banner,
          'moduleId': 'signaler',
          'moduleName': 'signaler',
          'sourceMap': true,
          'dest': `${paths.tmp}frontend/signaler-min.js`
        });

        bundles[3].write({
          'format': 'umd',
          'banner': paths.banner,
          'moduleId': 'angular-signaler',
          'moduleName': 'angular-signaler',
          'sourceMap': true,
          'dest': `${paths.tmp}frontend/angular-signaler-min.js`
        });
      }
    });
  });
}());
