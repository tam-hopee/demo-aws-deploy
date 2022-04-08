'use strict';
var apigClientFactory = require('aws-api-gateway-client').default;
var async = require('async');

exports.handler = (event, context, callback) => {
    var apigClient = apigClientFactory.newClient({
        invokeUrl: process.env.CC_API_URL
    });
    async.mapSeries(event.Records, function(record, callback) {
        if (record.eventName === "INSERT") {
            console.log(record.dynamodb.Keys.key);

            var params = {};
            var pathTemplate = '/blockchain/upload'
            var method = 'POST';
            var additionalParams = {
                headers: {
                    'Content-Type': 'application/json'
                },
                queryParams: {}
            };
            var body = {
                "key": record.dynamodb.Keys.key
            };
            apigClient.invokeApi(params, pathTemplate, method, additionalParams, body)
                .then(function(result) {
                    console.log(result);
                    callback(null, result);
                }).catch(function(error) {
                    console.log(error);
                    callback(error, null);
                });
        }
    }, function(err, res) {
        context.done();
    });
};
