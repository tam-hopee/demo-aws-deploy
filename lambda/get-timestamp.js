'use strict';
exports.handler = (event, context, callback) => {
    callback(null, {
        statusCode: '200',
        body: timestamp(null),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
};

var timestamp = (expireday) => {
    process.env.TZ = 'Asia/Tokyo';
    var dt = new Date();
    if (expireday) { dt.setDate(dt.getDate() + expireday); }
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
