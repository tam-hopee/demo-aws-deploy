'use strict';
const AWS = require('aws-sdk');
AWS.config.update({
    region: 'us-west-2'
});
const ses = new AWS.SES();
exports.handler = (event, context, callback) => {
    console.log(event);
    console.log(context);
    // Lambda関数のエラー通知用関数
    const mailowner = process.env.MAIL_OWNER;
    const maildone = (err, data) => {
        if (err) console.log('ERROR', err);
        else console.log(data);
    };
    // 検知メールを送信 -- ここから
    var maildata = {
        Destination: {
            ToAddresses: [mailowner]
        },
        Message: {
            Body: {
                Text: {
                    Data: "Lambda Function ERROR is occurred. (" + timestamp() + ")",
                    Charset: 'utf-8'
                },
            },
            Subject: {
                Data: 'クラウドコントラクトシステムメール_LambdaFunctionERROR',
                Charset: 'utf-8'
            }
        },
        Source: "CloudContract <info@cloudcontract.jp>"
    };
    ses.sendEmail(maildata, maildone);
    // 検知メールを送信 -- ここまで
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
    return String(year) + "/" + String(month) + "/" + String(day) + " " + String(hour) + ":" + String(min) + ":" + String(sec);
};
