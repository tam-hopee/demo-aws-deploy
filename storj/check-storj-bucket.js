'use strict';
var storj = require('storj-lib');
var async = require('async');
var AWS = require('aws-sdk');
var api = 'https://api.storj.io';
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});

exports.handler = (event, context, callback) => {
    var id = event.context['cognito-identity-id'];
    var user = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
    var privateKey = (event.context.stage == "prod") ? process.env.PRIVATE_KEY : process.env.PRIVATE_KEY_DEV;
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : res,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    userGet(user, id).then((userData) => {
        if (userData.Items[0].storjbucketid) {
            done(null, userData.Items[0]);
        } else {
            var keypair = storj.KeyPair(privateKey);
            var client = storj.BridgeClient(api, {
                keyPair: keypair
            });
            var bucketInfo = {
                name: id
            };
            isStrojBucketExist(client, id).then((result) => {
                if (!result) {
                    client.createBucket(bucketInfo, function(err, bucket) {
                        if (err) {
                            done(err, null);
                            console.log('ERROR', err.message);
                        } else {
                            userPut(user, id, bucket.id).then((data) => {
                                done(null, data);
                            }).catch((err) => {
                                done(err, null);
                                console.log('ERROR', err.message);
                            });
                        }
                    });
                } else {
                    userPut(user, id, result).then((data) => {
                        done(null, data);
                    }).catch((err) => {
                        done(err, null);
                        console.log('ERROR', err.message);
                    });
                }
            }).catch((err) => {
                done(err, null);
                console.log('ERROR', err.message);
            });
        }
    }).catch((err) => {
        done(err, null);
        console.log('ERROR', err.message);
    });
};

var userGet = (tableName, id) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": id,
        };
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val",
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": "id"
            }
        };
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
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

var isStrojBucketExist = (client, id) => {
    return new Promise((resolve, reject) => {
        var result;
        client.getBuckets(function(err, buckets) {
            if (err) reject(err);
            async.mapSeries(buckets, function(bucket, callback) {
                console.log(
                    'INFO',
                    'ID: %s, Name: %s, Storage: %s, Transfer: %s', [bucket.id, bucket.name, bucket.storage, bucket.transfer]
                );
                if (bucket.name === id) result = bucket.id;
                callback(null, result);
            }, function(err, res) {
                if (err) reject(err);
                else resolve(result);
            });
        });
    });
};
