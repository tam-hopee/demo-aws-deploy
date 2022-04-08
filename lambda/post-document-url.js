'use strict';
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
exports.handler = (event, context, callback) => {
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    var bucket = event['body-json'].bucket;
    var filename = event['body-json'].filename;
    var time = event['body-json'].time;
    var param = {
        Bucket: bucket,
        Key: filename,
        Expires: time
    };
    s3.getSignedUrl('getObject', param, done);
};
