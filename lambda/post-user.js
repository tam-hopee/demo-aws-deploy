'use strict';
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
var lambda = new AWS.Lambda();
exports.handler = (event, context, callback) => {
    var id = event.context['cognito-identity-id'];
    var user = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    userGet(user, id).then((userData) => {
        if (userData.Items[0]) {
            if (userData.Items[0].storjbucketid) {
                done(null, userData.Items[0]);
            } else {
                var plambda = {
                    FunctionName: 'check-storj-bucket',
                    InvokeArgs: JSON.stringify(event)
                };
                lambda.invokeAsync(plambda, done);
            }
        } else {
            var params = {
                TableName: user,
                Item: {
                    "id": id,
                    "email": event['body-json'].email
                }
            };
            dynamo.put(params, done);
        }
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
