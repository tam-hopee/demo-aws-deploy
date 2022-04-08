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
        console.log(data.Items[0].currentId)
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        console.log("currentId is:" + currentId)
        var status = event.params.querystring.status;
        var folderid = event.params.querystring.folderid;
        var res = status.split(",");
        var filter = "";
        var values = {
            ":val": currentId
        };
        var names = {
            "#k": "id",
            "#s": "status"
        };
        res.forEach(function(v) {
            filter += "#s = :status" + v + " OR ";
            var s = ":status" + v;
            values[s] = v;
        });
        filter = filter.substr(0, filter.length - 4); // delete last " OR "
        if (folderid) {
            filter += " AND #f = :folderid";
            values[":folderid"] = folderid;
            names["#f"] = "folderid";
        } else {
            filter += " AND attribute_not_exists(folderid)";
        }
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val",
            FilterExpression: filter,
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: names
        };
        // DynamoDBの1MB制約のため、再帰的に結果を呼び出す処理を適用
        const result = [];
        dynamo.query(param, onQuery);
        function onQuery(err, data) {
            if (err) {
                console.error(err);
                return Promise.reject(err);
            } else {
                if (result.length !== 0) {
                    data["Items"].forEach(item => {
                        result[0].push(item);
                    });
                } else {
                    result.push(data.Items);
                }
                if (typeof data.LastEvaluatedKey !== "undefined") {
                    param.ExclusiveStartKey = data.LastEvaluatedKey;
                    dynamo.query(param, onQuery);
                } else {
                    var items = {"Items": result[0]};
                    callback(null, {
                        statusCode: err ? '400' : '200',
                        body: err ? err.message : JSON.stringify(items),
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                }
            }
        }
    });
};
