'use strict';
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? {
        "user": process.env.CC_TABLE_USER,
        "prepare": process.env.CC_TABLE_PREPARE,
        "send": process.env.CC_TABLE_SEND,
        "receiver": process.env.CC_TABLE_RECEIVER,
        "reviewer": process.env.CC_TABLE_REVIEWER
    } : {
        "user": process.env.CC_TABLE_USER_DEV,
        "prepare": process.env.CC_TABLE_PREPARE_DEV,
        "send": process.env.CC_TABLE_SEND_DEV,
        "receiver": process.env.CC_TABLE_RECEIVER_DEV,
        "reviewer": process.env.CC_TABLE_REVIEWER_DEV
    };
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : res,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    switch (event.params.querystring.type) {
        case "receiver":
            userGet(tableName.user, event.context['cognito-identity-id']).then((userData) => {
                documentsCount(tableName.receiver, {
                    id: "receiver",
                    value: userData.Items[0].email
                }, "sent").then((data) => {
                    done(null, data);
                });
            });
            break;
        case "send":
            documentsCount(tableName.send, {
                id: "id",
                value: event.context['cognito-identity-id']
            }, "sent").then((data) => {
                done(null, data);
            });
            break;
        case "review":
            var count = 0;
            documentsCount(tableName.send, {
                id: "id",
                value: event.context['cognito-identity-id']
            }, "review").then((data) => {
                count += data;
                userGet(tableName.user, event.context['cognito-identity-id']).then((userData) => {
                    documentsCount(tableName.reviewer, {
                        id: "reviewer",
                        value: userData.Items[0].email
                    }, "review").then((data) => {
                        count += data;
                        done(null, count);
                    });
                });
            });
            break;
        case "prepare":
            documentsCount(tableName.prepare, {
                id: "id",
                value: event.context['cognito-identity-id']
            }, "notset,notsend").then((data) => {
                done(null, data);
            });
            break;
        default:
            done(null, null);
    }
};


var documentsCount = (tableName, key, status) => {
    return new Promise((resolve, reject) => {
        var res = status.split(",");
        var filter = "";
        var values = {
            ":val": key.value
        };
        res.forEach(function(v) {
            filter += "#s = :status" + v + " OR ";
            var s = ":status" + v;
            values[s] = v;
        });
        filter = filter.substr(0, filter.length - 4); // delete last " OR "
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val",
            FilterExpression: filter,
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": key.id,
                "#s": "status"
            }
        };
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data.Count);
        });
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
