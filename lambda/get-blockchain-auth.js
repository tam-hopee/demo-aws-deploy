'use strict';
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
    var blockchaintableName = (event.context.stage == "prod") ? process.env.CC_BLOCKCHAIN_TABLE : process.env.CC_BLOCKCHAIN_TABLE_DEV;
    var usertableName = (event.context.stage == "prod") ? process.env.CC_USER_TABLE : process.env.CC_USER_TABLE_DEV;
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    var userExpressionAttributeValues = {
        ":val": event.context['cognito-identity-id']
    };
    var user_param = {
        TableName: usertableName,
        KeyConditionExpression: "#k = :val",
        ExpressionAttributeValues: userExpressionAttributeValues,
        ExpressionAttributeNames: {
            "#k": "id"
        }
    };
    dynamo.query(user_param, function (err, data) {
        console.log(data.Items[0].currentId)
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        keyGet(tableName, event.params.querystring.key).then((data) => {
            var values = {
                ":key": data.Items[0].key
            };
            var param = {
                TableName: blockchaintableName,
                KeyConditionExpression: "#s = :key",
                ExpressionAttributeValues: values,
                ExpressionAttributeNames: {
                    "#s": "key"
                },
                ScanIndexForward: false
            };
            var isme = (data.Items[0].id == currentId) ? true : false;
            dynamo.query(param, function (err, data) {
                data.Items[0].isme = isme;
                done(null, data);
            });
        });
    });
};


var keyGet = (tableName, id) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": id,
        };
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val",
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": "key"
            }
        };
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};
