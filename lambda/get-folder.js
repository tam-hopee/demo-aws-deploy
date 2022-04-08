'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? process.env.CC_FOLDER_TABLE : process.env.CC_FOLDER_TABLE_DEV;
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
    // Get the currentId to check if the user is switching.
    dynamo.query(user_param, function (err, data) {
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        console.log("currentId is:" + currentId)
    
        var status = event.params.querystring.status;
        var tab = event.params.querystring.tab;
        var parentfolderid = event.params.querystring.parentfolderid;
        var res = status.split(",");
        var filter = "";
        var values = {
            ":val": currentId
        };
        var names = {
            "#k": "id",
            "#s": "status"
        };
        res.forEach(function (v) {
            filter += "#s = :status" + v + " OR ";
            var s = ":status" + v;
            values[s] = v;
        });
        filter = filter.substr(0, filter.length - 4); // delete last " OR "
        if (tab) {
            filter += " AND #t = :tab";
            values[":tab"] = tab;
            names["#t"] = "tab";
        }
        if (parentfolderid) {
            if (parentfolderid !== "all") { // all 指定は親フォルダ指定なしで取りに行く想定
                filter += " AND #f = :parentfolderid";
                values[":parentfolderid"] = parentfolderid;
                names["#f"] = "parentfolderid";
            }
        } else {
            filter += " AND attribute_not_exists(parentfolderid)";
        }
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val",
            FilterExpression: filter,
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: names,
            ScanIndexForward: false
        };
        dynamo.query(param, done);
    });
};
