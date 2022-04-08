'use strict';
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var BUCKET = (event.context.stage == "prod") ? process.env.CC_BUCKET : process.env.CC_BUCKET_DEV;
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

    dynamo.query(user_param, function (err, data) { // Get the currentId to check if the user is switching.
        console.log(data.Items[0].currentId)
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        console.log("currentId is:" + currentId)
        var date = jpdate();
        var id = currentId;
        var dir = BUCKET + "/" + id + "/" + date.year + "/" + date.month + "/" + date.day + "/" + date.hour + "/" + date.min + "/" + date.sec;
        var base64data = event['body-json'].data.substr(28); // byte count is 28. -> data:application/pdf;base64,
        var data = new Buffer.from(base64data, 'base64');
        var file = event['body-json'].filename;
        var param = {
            Bucket: dir,
            Key: file,
            Body: data,
            ContentType: "application/pdf"
        };
        console.log("s3 upload...");
        s3.upload(param, done);
    });
};


var jpdate = () => {
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
    return {
        year: year,
        month: month,
        day: day,
        hour: hour,
        min: min,
        sec: sec
    };
};
