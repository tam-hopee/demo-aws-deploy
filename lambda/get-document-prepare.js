'use strict';
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
    var usertableName = (event.context.stage == "prod") ? process.env.CC_USER_TABLE : process.env.CC_USER_TABLE_DEV;
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
    var user_param = {
        TableName: usertableName,
        KeyConditionExpression: "#k = :val",
        ExpressionAttributeValues: values,
        ExpressionAttributeNames: {
            "#k": "id"
        }
    };
    dynamo.query(user_param, function (err, data) {
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        var status = event.params.querystring.status;
        var res = status.split(",");
        var filter = "";
        var values = {
            ":val": currentId
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
                "#k": "id",
                "#s": "status"
            }
        };
        dynamo.query(param, done);
        
    })
};
