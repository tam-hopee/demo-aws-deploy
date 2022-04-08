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
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        console.log("currentId is:" + currentId)
        userGet(usertableName, currentId).then((data) => {
            var status = event.params.querystring.status;
            var key = event.params.querystring.key;
            var folderid = event.params.querystring.folderid;
            var res = status.split(",");
            var expression = "#k = :val";
            var filter = "";
            var values = {
                ":val": data.Items[0].email
            };
            var names = {
                "#k": "receiver",
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
            if (key) {
                expression += " AND #e = :key";
                values[":key"] = key;
                names["#e"] = "key";
            }
            var param = {
                TableName: tableName,
                KeyConditionExpression: expression,
                FilterExpression: filter,
                ExpressionAttributeValues: values,
                ExpressionAttributeNames: names
            };
            dynamo.query(param, function(err, data) {
                if (!key) done(null, data);
                else {
                    if (timestamp() > data.Items[0].expiretime) done(null, {
                        result: "expired",
                        sender: data.Items[0].sender
                    });
                    else done(null, data);
                }
            });
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
