// README: Split this file up if it starts getting too long. ( i.e. 300 lines )
//

// This gulp asset pipeline supports linting of scss and js files along with
// compiling and bundling css and js files into static/assets/ directories to
// be used by Hugo.

var gulp = require('gulp');
var gutil = require('gulp-util');
var eslint = require('gulp-eslint');
var browserify = require('browserify');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var scsslint = require('gulp-scss-lint');
var del = require('del');
var filter = require('gulp-filter');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');
var pkg = require('./package.json');
var sassFiles = filter([ '**/*.scss' ], { restore: true });
var jsFiles = filter([ '**/*.js' ], { restore: true });
var spawn = require('child_process').spawn;

var cFlags = {
  production: false,
  test: true,
};

gulp.task('no-test', function (done) {
  gutil.log(gutil.colors.cyan('no-test'), 'Disabling tests');
  cFlags.test = false;
  done();
});

gulp.task('production', function (done) {
  gutil.log(gutil.colors.cyan('production'), 'Enabling production tasks');
  cFlags.production = true;
  done();
});

gulp.task('clean-all', function () {
  return del([
    './static/assets/**/*',
    './public/**/*',
  ]);
});

gulp.task('scss-lint', function (done) {

  if (!cFlags.test) {
    gutil.log(gutil.colors.cyan('scss-lint'), 'Disabling linting');
    return done();
  }

  return gulp.src('./assets/styles/**/*.scss')
    .pipe(scsslint({
      config: './.scss-lint.yml',
    }));

});

gulp.task('eslint', function (done) {

  if (!cFlags.test) {
    gutil.log(gutil.colors.cyan('eslint'), 'Disabling linting');
    return done();
  }

  return gulp.src('./assets/scripts/**/*.js')
    .pipe(eslint({
      configFile: './.eslintrc',
    }))
    .pipe(eslint.format());

});

gulp.task('styles:homepage', [ 'scss-lint' ], function () {

  gutil.log(gutil.colors.cyan('styles:homepage'), 'Compiling Sass assets');

  var sassStream = sass();
  var stream = gulp.src('./assets/styles/homepage.scss');

  if (cFlags.production) {
    gutil.log(gutil.colors.cyan('styles:homepage'), 'Compressing styles');
    sassStream = sass({ outputStyle: 'compressed' });
  }

  stream = stream.pipe(sassStream)
    .on('error', function (error) {
      gutil.log(
        gutil.colors.yellow('styles:homepage'),
        gutil.colors.red('error'),
        '\n',
        error.messageFormatted
      );
      this.emit('end');
    })
    .pipe(gulp.dest('./static/assets/styles'));

  return stream;

});

gulp.task('scripts', [ 'eslint' ], function () {

  gutil.log(gutil.colors.cyan('scripts'), 'Browserifying JavaScript assets');

  var bundle = browserify({
    entries: './assets/scripts/start.js',
    debug: true,
  }).bundle();

  bundle = bundle.pipe(source('start.js'))
    .pipe(buffer());

  if (cFlags.production) {
    gutil.log(gutil.colors.cyan('scripts'), 'Compressing scripts');
    bundle = bundle.pipe(uglify());
  }

  bundle = bundle.pipe(rename('main.js'))
    .pipe(gulp.dest('./static/assets/scripts'));

  return bundle;

});

gulp.task('images', function () {

  gutil.log(gutil.colors.cyan('images'), 'Copying image assets');
  var stream = gulp.src([
    './assets/images/**/*',
    './node_modules/uswds/src/img/**/*',
  ]);

  return stream.pipe(gulp.dest('./static/assets/images'));

});

gulp.task('fonts', function () {

  gutil.log(gutil.colors.cyan('fonts'), 'Copying font assets');
  var stream = gulp.src([
    './assets/fonts/**/*',
    './node_modules/uswds/src/fonts/**/*',
  ]);

  return stream.pipe(gulp.dest('./static/assets/fonts'));

});

gulp.task('build', [ 'clean-all' ], function (done) {
  printPackageInfo();
  gutil.log(gutil.colors.cyan('build'), 'Building asset-pipeline');
  runSequence([ 'styles:homepage', 'scripts', 'images', 'fonts' ], done);
});

gulp.task('build:website', [ 'build' ], function (done) {

  gutil.log(gutil.colors.cyan('build:website'), 'Building static website via Hugo');

  var hugo = spawn('hugo');

  hugo.stdout.on('data', function (data) {
    gutil.log(gutil.colors.blue('build:website'), '\n' + data);
  });

  hugo.on('error', done);
  hugo.on('close', done);

});

gulp.task('watch', function () {
  gutil.log(gutil.colors.cyan('watch'), 'Watching assets for changes');
  gulp.watch('./assets/styles/**/*.scss', [ 'styles:homepage' ]);
  gulp.watch('./assets/scripts/**/*.js', [ 'scripts' ]);
  gulp.watch('./assets/images/**/*', [ 'images' ]);
});

gulp.task('website', [ 'build', 'watch' ], function (done) {

  var buildDrafts = '--buildDrafts';

  if (cFlags.production) {
    buildDrafts = '';
  }

  var hugo = spawn('hugo', [ 'server', buildDrafts ]);

  hugo.stdout.on('data', function (data) {
    gutil.log(gutil.colors.blue('website'), '\n' + data);
  });

  hugo.on('error', done);
  hugo.on('close', done);

});

gulp.task('default', function (done) {
  printPackageInfo();
  gutil.log('Available tasks');
  gutil.log('$', gutil.colors.magenta('gulp watch'));
  gutil.log('Watch for changes and build the asset-pipeline');
  gutil.log('$', gutil.colors.magenta('gulp [ production, no-test ] build'));
  gutil.log('Build the asset-pipeline with optional production and no-test flags');
  gutil.log('$', gutil.colors.magenta('gulp clean-all'));
  gutil.log('Removes files and directories generated by gulp');
  gutil.log('$', gutil.colors.magenta('gulp [ production ] website'));
  gutil.log('Runs the gulp watch and hugo serve');
  gutil.log('$', gutil.colors.magenta('gulp [ production ] build:website'));
  gutil.log('Build the asset-pipeline and the website using Hugo');
});

function printPackageInfo () {
  gutil.log(
    gutil.colors.yellow('v' + pkg.version),
    gutil.colors.green(pkg.name)
  );
  gutil.log(gutil.colors.red(' ______ ______ _____    '));
  gutil.log(gutil.colors.red('/\\  ___/\\  ___/\\  __-.  '));
  gutil.log(gutil.colors.blue('\\ \\  __\\ \\  __\\ \\ \\/\\ \\ '));
  gutil.log(gutil.colors.blue(' \\ \\_\\  \\ \\_\\  \\ \\____- '));
  gutil.log(gutil.colors.white('  \\/_/   \\/_/   \\/____/ '));
  gutil.log();
}
