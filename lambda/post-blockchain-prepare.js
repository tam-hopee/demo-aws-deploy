'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    const tableName = (event.context.stage == "prod") ? {
        "blockchain_prepare": process.env.CC_TABLE_BLOCKCHAIN_PREPARE
    } : {
        "blockchain_prepare": process.env.CC_TABLE_BLOCKCHAIN_PREPARE_DEV
    };
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    const _err = (err) => {
        if (err) {
            done(err, null);
            console.log('ERROR', err.message);
        } else {
            return;
        }
    };
    var item = {
        "key": event['body-json'].key,
        "createdtime": timestamp(),
        "s3bucket": event['body-json'].bucket,
        "s3file": event['body-json'].file
    };
    putDB(tableName.blockchain_prepare, item).then((data) => {
        done(null, data);
    }).catch((err) => {
        _err(err);
    });
};


var putDB = (tableName, Item) => {
    return new Promise((resolve, reject) => {
        var params = {
            TableName: tableName,
            Item: Item
        };
        dynamo.put(params, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var timestamp = () => {
    process.env.TZ = 'Asia/Tokyo';
    var dt = new Date();
    var year = dt.getFullYear();
    var month = dt.getMonth() + 1;
    var day = dt.getDate();
    var hour = dt.getHours();
    var min = dt.getMinutes();
    var sec = dt.getSeconds();
    if (month < 10) month = '0' + month;
    if (day < 10) day = '0' + day;
    if (hour < 10) hour = '0' + hour;
    if (min < 10) min = '0' + min;
    if (sec < 10) sec = '0' + sec;
    return String(year) + String(month) + String(day) + String(hour) + String(min) + String(sec);
};
