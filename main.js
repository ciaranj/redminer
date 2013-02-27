var rest = require('restler');

var Redminer = function (uri, apiKey) {
    this.uri = uri;
    this.apiKey = apiKey;
    if( uri.indexOf("/projects") == -1 ) {
      this.rootUri= uri;
    } else {
      this.rootUri= uri.substring( 0, uri.indexOf("/projects") );
    }
};

function makeRequest(fn, uri, options, selector, callback) {
    fn(uri, options)
        .on('complete', function (result) {
            if (result instanceof Error) {
                callback(result);
            } else {
                callback(null, selector(result));
            }
        });
}

Redminer.prototype.getRepresentations = function (representationUrl, criteria, page, callback) {

    var query = {};

    if (page) {
        query.page = page;
    }
    if (criteria) {
        for(var k in criteria) {
          query[k]= criteria[k];
        }
    }
    query.limit= 100;
    makeRequest(rest.get, representationUrl, {
        headers: {'X-ChiliProject-API-Key': this.apiKey},
        query: query
    }, function (x) {
        return x;
    }, callback);
};

Redminer.prototype.getRepresentationsFromPage = function (representationUrl, representationResultProperty, criteria, page, callback) {
    var self = this;
    this.getRepresentations(representationUrl, criteria, page, function (error, result) {
        if (error) {
            return callback(error, result);
        }
        if (result.total_count > ((result.offset + result.limit))) {
            self.getRepresentationsFromPage(representationUrl, representationResultProperty, criteria, page + 1, function (error, nextPage) {
              if(error ) {
                callback(error);
              } 
              else {
                for( var k in nextPage ) {
                  result[representationResultProperty].push( nextPage[k] );
                }
               callback(null, result[representationResultProperty]);
             }
            });
        }
        else {
            callback(null, result[representationResultProperty]);
        }
    });
};


Redminer.prototype.getAllIssues = function (queryId, callback) {
    this.getRepresentationsFromPage(this.uri + '/issues.json', "issues", {query_id: queryId}, 1, callback);
};

Redminer.prototype.getIssueUri = function (id) {
    return this.uri + '/issues/' + id;
};

Redminer.prototype.getIssue = function (id, callback) {

    var query = {include: 'journals'};

    makeRequest(rest.get, this.getIssueUri(id) + '.json', {
        headers: {'X-Redmine-API-Key': this.apiKey},
        query: query
    }, function (x) {
        return x.issue;
    }, callback);
};


// criteria.status=0 All
// criteria.status=1 Active
// criteria.status=2 Registered
// criteria.status=3 Locked
// The method defaults to 'all'
Redminer.prototype.getAllUsers = function (criteria, callback) {
  if( typeof(criteria) == "function" ) {
    callback= criteria;
    criteria= {status: "active" }
  }
  this.getRepresentationsFromPage(this.rootUri + '/users.json', "users", criteria, 1, callback);
};

module.exports = Redminer;