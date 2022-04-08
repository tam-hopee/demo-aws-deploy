'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    const tableName = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
    const usertableName = (event.context.stage == "prod") ? process.env.CC_USER_TABLE : process.env.CC_USER_TABLE_DEV;
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
    // Get the currentId to check if the user is switching.
    dynamo.query(user_param, function (err, data) {
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        console.log("currentId is:" + currentId)
    
        var status = event.params.querystring.status;
        var folderid = event.params.querystring.folderid;
        var etag = event.params.querystring.etag;
        var res = status.split(",");
        var filter = "";
        var values = {
            ":val": currentId
        };
        var names = {
            "#k": "id",
            "#s": "status"
        };
        var expression = "#k = :val";
        res.forEach(function (v) {
            filter += "#s = :status" + v + " OR ";
            var s = ":status" + v;
            values[s] = v;
        });
        filter = filter.substr(0, filter.length - 4); // delete last " OR "
        if (folderid == "ignore") {
            // ignore folder id filter.
        } else if (folderid) {
            filter += " AND #f = :folderid";
            values[":folderid"] = folderid;
            names["#f"] = "folderid";
        } else {
            filter += " AND attribute_not_exists(folderid)";
        }
        if (etag) {
            expression += " AND #e = :etag";
            values[":etag"] = etag;
            names["#e"] = "etag";
        }
        var param = {
            TableName: tableName,
            KeyConditionExpression: expression,
            FilterExpression: filter,
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: names
        };
        dynamo.query(param, done);
    });
};
