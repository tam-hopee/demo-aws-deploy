'use strict';
var storj = require('storj-lib');
var async = require('async');
var AWS = require('aws-sdk');
var api = 'https://api.storj.io';
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});

exports.handler = (event, context, callback) => {
    var user = process.env.CC_TABLE;
    var privateKey = process.env.PRIVATE_KEY;
    var keypair = storj.KeyPair(privateKey);
    var client = storj.BridgeClient(api, {
        keyPair: keypair
    });
    async.mapSeries(event.Records, function(record, callback) {
        var id = record.dynamodb.Keys.id.S;
        if (record.eventName === "INSERT") {
            var bucketInfo = {
                name: id
            };
            client.createBucket(bucketInfo, function(err, bucket) {
                if (err) {
                    console.log('ERROR', err.message);
                    callback(err, null);
                } else {
                    userPut(user, id, bucket.id).then((data) => {
                        callback(null, data);
                    }).catch((err) => {
                        console.log('ERROR', err.message);
                        callback(err, null);
                    });
                }
            });
        }
    }, function(err, res) {
        context.done();
    });
};

var userPut = (tableName, id, value) => {
    return new Promise((resolve, reject) => {
        var params = {
            TableName: tableName,
            Key: {
                "id": id
            },
            UpdateExpression: "set #storjbucketid = :s",
            ExpressionAttributeNames: {
                "#storjbucketid": "storjbucketid",
            },
            ExpressionAttributeValues: {
                ":s": value
            }
        };
        dynamo.update(params, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};
