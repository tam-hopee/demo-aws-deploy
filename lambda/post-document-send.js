'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? {
        "send": process.env.CC_TABLE_SEND,
        "receiver": process.env.CC_TABLE_RECEIVER,
        "reviewer": process.env.CC_TABLE_REVIEWER,
        "keys": process.env.CC_TABLE_KEYS,
        "renderpdf": process.env.CC_TABLE_RENDERPDF,
        "user": process.env.CC_USER_TABLE
    } : {
        "send": process.env.CC_TABLE_SEND_DEV,
        "receiver": process.env.CC_TABLE_RECEIVER_DEV,
        "reviewer": process.env.CC_TABLE_REVIEWER_DEV,
        "keys": process.env.CC_TABLE_KEYS_DEV,
        "renderpdf": process.env.CC_TABLE_RENDERPDF_DEV,
        "user": process.env.CC_USER_TABLE_DEV
    };
    
    var userExpressionAttributeValues = {
        ":val": event.context['cognito-identity-id']
    };
    var userExpressionAttributeValues = {
        TableName: tableName.user,
        KeyConditionExpression: "#k = :val",
        ExpressionAttributeValues: userExpressionAttributeValues,
        ExpressionAttributeNames: {
            "#k": "id"
        }
    };
    // Get the currentId to check if the user is switching.
    dynamo.query(userExpressionAttributeValues, function (err, data) {
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        console.log("currentId is:" + currentId)
    
        var key = event['body-json'].key;
        var expireday = Number(process.env.CC_EXPIREDAY);
        var params_send = {
            TableName: tableName.send,
            Item: {
                // @dynamo cc${stageName}-document-send
                // id: primary key, key: sort key
                "id": currentId,
                "key": key,
                "bucket": event['body-json'].bucket,
                "filename": event['body-json'].filename,
                "sender": event['body-json'].sender,
                "receiver": event['body-json'].receiver,
                "expiretime": timestamp(expireday),
                "createdtime": timestamp(null),
                "timestamp": timestamp(null),
                "status": event['body-json'].status,
                "verifycode": geneRandom(),
                "requestMessage": event['body-json'].requestMessage
            }
        };
        var params_receiver = {
            TableName: tableName.receiver,
            Item: {
                // @dynamo cc${stageName}-document-receiver
                // receiver: primary key, key: sort key
                // "receiver": set updateReceiverTable function();
                "key": key,
                "bucket": event['body-json'].bucket,
                "filename": event['body-json'].filename,
                "sender": event['body-json'].sender,
                "expiretime": timestamp(expireday),
                "createdtime": timestamp(null),
                "timestamp": timestamp(null),
                "status": event['body-json'].status,
                "signatureCount": event['body-json'].signatureCount,
                "requestMessage": event['body-json'].requestMessage
            }
        };
        var params_reviewer = {
            TableName: tableName.reviewer,
            Item: {
                // @dynamo cc${stageName}-document-reviewer
                // reviewer: primary key, key: sort key
                // "reviewer": set updateReviewerTable function();
                "key": key,
                "bucket": event['body-json'].bucket,
                "filename": event['body-json'].filename,
                "sender": event['body-json'].sender,
                "receiver": event['body-json'].receiver,
                "expiretime": timestamp(expireday),
                "createdtime": timestamp(null),
                "timestamp": timestamp(null),
                "status": event['body-json'].status,
            }
        };
        var params_keys = {
            TableName: tableName.keys,
            Item: {
                // @dynamo cc${stageName}-document-keys
                // key: primary key
                "key": key,
                "id": currentId,
                "receiver": event['body-json'].receiver,
                "reviewers": event['body-json'].reviewers,
                "expiretime": timestamp(expireday),
                "createdtime": timestamp(null),
                "timestamp": timestamp(null),
                "status": event['body-json'].status
            }
        };
        var params_renderpdf = {
            TableName: tableName.renderpdf,
            Item: {
                // @dynamo cc${stageName}-document-renderpdf
                // key: primary key
                "key": key,
                "createdtime": timestamp(null),
                "timestamp": timestamp(null),
                "renderpdf": event['body-json'].renderpdf
            }
        };
        const type = event['body-json'].type;
        if (type === "multiple") {
            // 複数者間契約の場合の処理
            params_send.Item.type = type;
            params_receiver.Item.type = type;
            params_reviewer.Item.type = type;
            params_keys.Item.type = type;
        }
        var updateReceiverTable = event['body-json'].receiver.map((val, index) => {
            params_receiver.Item.receiver = val;
            return new Promise((resolve, reject) => {
                dynamo.put(params_receiver, function (err, data) {
                    console.log("UPDATE:" + params_receiver.TableName);
                    if (err) reject(err);
                    else resolve(data);
                });
            });
        });
        var updateReviewerTable = event['body-json'].reviewers.map((val, index) => {
            params_reviewer.Item.reviewer = val;
            return new Promise((resolve, reject) => {
                dynamo.put(params_reviewer, function (err, data) {
                    console.log("UPDATE:" + params_reviewer.TableName);
                    if (err) reject(err);
                    else resolve(data);
                });
            });
        });
        var updateSendTable = function () {
            return new Promise((resolve, reject) => {
                dynamo.put(params_send, function (err, data) {
                    console.log("UPDATE:" + params_send.TableName);
                    if (err) reject(err);
                    else resolve(data);
                });
            });
        };
        var updateKeysTable = function () {
            return new Promise((resolve, reject) => {
                dynamo.put(params_keys, function (err, data) {
                    console.log("UPDATE:" + params_keys.TableName);
                    if (err) reject(err);
                    else resolve(data);
                });
            });
        };
        var updateRenderpdfTable = function () {
            return new Promise((resolve, reject) => {
                dynamo.put(params_renderpdf, function (err, data) {
                    console.log("UPDATE:" + params_renderpdf.TableName);
                    if (err) reject(err);
                    else resolve(data);
                });
            });
        };
        updateSendTable()
        .then(updateReceiverTable)
        .then(updateReviewerTable)
        .then(updateKeysTable)
        .then(updateRenderpdfTable)
        .then(callback(null, "UPDATE DONE!!!"));
    });
};


var timestamp = (expireday) => {
    process.env.TZ = 'Asia/Tokyo';
    var dt = new Date();
    if (expireday) {
        dt.setDate(dt.getDate() + expireday);
    }
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

var geneRandom = () => {
    var l = 8;
    var c = "abcdefghijklmnopqrstuvwxyz0123456789";
    var cl = c.length;
    var r = "";
    for (var i = 0; i < l; i++) {
        r += c[Math.floor(Math.random() * cl)];
    }
    return r;
};
