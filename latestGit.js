'use strict';
var git = require("git-promise");
var Q = require("q");

module.exports = function (remote, cb) {
	[
		fetch,
		getBranch,
		findDifferences
	].reduce(Q.when, Q({
		remote: remote
	})).done(function (info) {
		cb(null, info);
	}, function (error) {
		cb(error || "Unable to check git status");
	});
};

function fetch (info) {
	return git("fetch " + info.remote, function () {
		return info;
	});
}

function getBranch (info) {
	return git("git rev-parse --abbrev-ref HEAD", function (out) {
		info.branch = out.trim();
		return info;
	});
}


function findDifferences (info) {
	var commitFormat = /commit>([\da-f]+)-([^<]+)</g;
	return git("rev-list " +
		info.branch + ".." + info.remote + "/" + info.branch +
		" --relative-date --format=format:\"commit>%h-%cr<\"",
		function (out) {
			var commits = [];
			out.replace(commitFormat, function (full, hash, date) {
				commits.push({
					hash: hash,
					date: date
				});
			});

			info.commits = commits;
			return info;
		}
	);
}
