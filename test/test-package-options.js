/*global describe, it, afterEach */
'use strict';
var assert = require('assert');
var fs = require('fs');
var updateNotifier = require('../lib/update-notifier');


describe('package options', function () {
  it('should not read the local package.json when a version and name is passed', function () {
    var notifier = updateNotifier({
      packageVersion: '0.0.1',
      packageName: 'magical-doge'
    });

    assert.equal(notifier.packageFile, undefined, 'packageFile should be undefined');
  });

  it('should not read local package.json when only a version is passed', function () {
    var notifier = updateNotifier({
      packageVersion: '0.0.1',
      packagePath: '../package.json'
    });

    assert.notEqual(notifier.packageFile, undefined, 'packageFile should be read');
  });
});
