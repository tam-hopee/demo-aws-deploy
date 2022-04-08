'use strict';
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
exports.handler = (event, context, callback) => {
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    var date = jpdate();
    var bucket = event['body-json'].bucket;
    var base64data = event['body-json'].data.substr(28); // byte count is 28. -> data:application/pdf;base64,
    var data = new Buffer.from(base64data, 'base64');
    var file = event['body-json'].filename;
    var param = {
        Bucket: bucket,
        Key: file,
        Body: data,
        ContentType: "application/pdf"
    };
    console.log("s3 upload...");
    s3.upload(param, function (err, data) {
        var functionName = (event.context.stage == "prod") ? process.env.PROD_AMANO_SIGN : process.env.DEV_AMANO_SIGN;
        var lambda = new AWS.Lambda();
        var invoke_params = {
            FunctionName: functionName,
            InvocationType: "Event",
            Payload: JSON.stringify({"bucket":bucket, "fileName": file})
        };
        
        lambda.invoke(invoke_params, function (error, data) {
            if (error) {
                console.log("error");
            }
            else {
                console.log("lambda invoke end");
                done(err, data)
            }
        })
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
