'use strict';
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    var values = {
        ":val": event.context['cognito-identity-id']
    };
    var param = {
        TableName: tableName,
        KeyConditionExpression: "#k = :val",
        ExpressionAttributeValues: values,
        ExpressionAttributeNames: {
            "#k": "id"
        }
    };
    dynamo.query(param, done);
};
