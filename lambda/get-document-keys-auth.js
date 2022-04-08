'use strict';
const CryptoJS = require('crypto-js');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? {
        "key": process.env.CC_TABLE_KEY,
        "receiver": process.env.CC_TABLE_RECEIVER,
        "auth": process.env.CC_TABLE_AUTH,
        "renderpdf": process.env.CC_TABLE_RENDERPDF,
        "user": process.env.CC_USER_TABLE
    } : {
        "key": process.env.CC_TABLE_KEY_DEV,
        "receiver": process.env.CC_TABLE_RECEIVER_DEV,
        "auth": process.env.CC_TABLE_AUTH_DEV,
        "renderpdf": process.env.CC_TABLE_RENDERPDF_DEV,
        "user": process.env.CC_USER_TABLE_DEV
    };
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });

    keyGet(tableName.user, "id", event.context['cognito-identity-id']).then((userData) => { // Get the currentId to check if the user is switching.
        var currentId = event.context['cognito-identity-id']
        if (userData.Items[0].currentId) {
            currentId = userData.Items[0].currentId
        }
        console.log("currentId is:" + currentId)
        keyGet(tableName.auth, "id", "appkey").then((appkey) => { // アプリ共通 復号キー取得
            var email = CryptoJS.AES.decrypt(event.params.querystring.receiver, appkey.Items[0].key).toString(CryptoJS.enc.Utf8);
            keyGet(tableName.key, "key", event.params.querystring.key).then((data) => {
                // 社内稟議対応
                let processed_reviewers = data.Items[0].processed_reviewers;
                let reviewerList = data.Items[0].reviewers;
                var isreviewer = false;
                if (reviewerList) {
                    reviewerList.forEach(function(val) {
                        if (val === email) isreviewer = true;
                    });
                }
                // ---
                let processed_receivers = data.Items[0].processed_receivers;
                let receiverList = data.Items[0].receiver;
                var _receiver = '';
                var isreceiver = false;
                if (typeof receiverList === typeof []) {
                    // 配列の場合（＝複数者間契約の実装リリース後に発生するパターン）
                    _receiver = receiverList[0];
                    receiverList.forEach(function(val) {
                        if (val === email) {
                            _receiver = email;
                            isreceiver = true;
                        }
                    });
                } else {
                    _receiver = receiverList;
                    if (_receiver === email) {
                        isreceiver = true;
                    }
                }
                var values = {
                    ":val": _receiver,
                    ":key": data.Items[0].key
                };
                var params_receiver = {
                    TableName: tableName.receiver,
                    KeyConditionExpression: "#k = :val AND #s = :key",
                    ExpressionAttributeValues: values,
                    ExpressionAttributeNames: {
                        "#k": "receiver",
                        "#s": "key"
                    }
                };
                var params_renderpdf = {
                    TableName: tableName.renderpdf,
                    KeyConditionExpression: "#k = :key",
                    ExpressionAttributeValues: {
                        ":key": data.Items[0].key
                    },
                    ExpressionAttributeNames: {
                        "#k": "key"
                    }
                };
                var isme = (data.Items[0].id == currentId) ? true : false;
                if ((!isme) && (!isreceiver) && (!isreviewer)) {
                    // 自分のアイテムでも受信者でも確認者でもない場合は認証エラーを返却する。
                    done(null, {
                        result: "invalid",
                    });
                }
                dynamoQuery(params_receiver).then((data) => {
                    // 受信者情報(data)を取得
                    data.Items[0].isme = isme;
                    dynamoQuery(params_renderpdf).then((renderpdf) => {
                        // 署名情報を取得し、返却値データ加工
                        data.Items[0].processed_reviewers = processed_reviewers; // 社内稟議対応
                        data.Items[0].reviewer = reviewerList; // 社内稟議対応
                        data.Items[0].processed_receivers = processed_receivers; // 複数者間契約対応
                        data.Items[0].receiver = receiverList; // 複数者間契約対応
                        data.Items[0].renderpdf = renderpdf.Items[0].renderpdf;
                        if (data.Items[0].status == "concluded" || data.Items[0].status == "dismissal") done(null, data);
                        else if (timestamp() > data.Items[0].expiretime) done(null, {
                            result: "expired",
                            sender: data.Items[0].sender
                        });
                        else if (data.Items[0].status === "deactive") done(null, {
                            result: "deactive",
                            sender: data.Items[0].sender
                        });
                        else done(null, data);
                    });
                });
            });
        });
    });
};

var dynamoQuery = (param) => {
    return new Promise((resolve, reject) => {
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var keyGet = (tableName, name, value) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": value,
        };
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val",
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": name
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
