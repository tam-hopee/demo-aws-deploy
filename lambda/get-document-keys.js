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
        "send": process.env.CC_TABLE_SEND,
        "auth": process.env.CC_TABLE_AUTH,
        "renderpdf": process.env.CC_TABLE_RENDERPDF
    } : {
        "key": process.env.CC_TABLE_KEY_DEV,
        "receiver": process.env.CC_TABLE_RECEIVER_DEV,
        "send": process.env.CC_TABLE_SEND_DEV,
        "auth": process.env.CC_TABLE_AUTH_DEV,
        "renderpdf": process.env.CC_TABLE_RENDERPDF_DEV
    };
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    keyGet(tableName.auth, "id", "appkey").then((appkey) => { // アプリ共通 復号キー取得
        var email = CryptoJS.AES.decrypt(event.params.querystring.receiver, appkey.Items[0].key).toString(CryptoJS.enc.Utf8);
        keyGet(tableName.key, "key", event.params.querystring.key).then((data) => {
            if (data.Count === 0) done(null, {
                result: "invalid"
            });
            var isreviewer = false;
            // 社内稟議対応
            let processed_reviewers = data.Items[0].processed_reviewers;
            let reviewerList = data.Items[0].reviewers;
            if (reviewerList) {
                reviewerList.forEach(function(val) {
                    if (email === val) isreviewer = true;
                });
            }
            // ---
            let processed_receivers = data.Items[0].processed_receivers;
            let receiverList = data.Items[0].receiver;
            var _receiver = '';
            var isreceiver = false;
            if (typeof receiverList === typeof []) {
                // 配列の場合（＝複数者間契約の実装リリース後に発生するパターン）
                _receiver = (email) ? email : receiverList[0];
                receiverList.forEach(function(val) {
                    if (email === val) isreceiver = true;
                });
            } else {
                _receiver = receiverList;
                if (email === _receiver) isreceiver = true;
            }
            // 社内稟議確認者であり、受信者でない場合は受信者リストの配列からセット
            if (isreviewer && (!isreceiver)) _receiver = receiverList[0];
            keyGet(tableName.auth, "id", "owner").then((auths) => { // 特権アクセス簡易実装版: authkeys.is = owner value is keyで判定。
                var isowner = false;
                if (auths.Items[0]) {
                    if (auths.Items[0].key === event.params.querystring.authkey) {
                        isowner = true;
                    } else {
                        isowner = false;
                    }
                }
                if (!(isowner) && (!isreceiver) && (!isreviewer)) {
                    done(null, {
                        result: "invalid"
                    });
                } else {
                    var _values = {
                        ":val": data.Items[0].id,
                        ":key": data.Items[0].key
                    };
                    var _param = {
                        TableName: tableName.send,
                        KeyConditionExpression: "#k = :val AND #s = :key",
                        ExpressionAttributeValues: _values,
                        ExpressionAttributeNames: {
                            "#k": "id",
                            "#s": "key"
                        }
                    };
                    dynamoQuery(_param).then((send) => {
                        var isprocessed = false;
                        if (isreviewer) isprocessed = true; // 社内稟議確認者であれば閲覧権限付与
                        if (data.Items[0].status === "concluded" || data.Items[0].status === "dismissal") isprocessed = true;
                        if (event.params.querystring.verifycode == send.Items[0].verifycode) isprocessed = true;
                        if (processed_receivers) {
                            // 複数者間契約対応
                            processed_receivers.forEach(function(val) {
                                if (email === val.receiver) isprocessed = true;
                            });
                        }
                        if (!isprocessed) {
                            done(null, {
                                result: "invalid"
                            });
                        } else {
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
                            dynamoQuery(params_receiver).then((receiver) => {
                                // 受信者情報(receiver)を取得
                                dynamoQuery(params_renderpdf).then((renderpdf) => {
                                    // 署名情報を取得し、返却値データ加工
                                    receiver.Items[0].processed_reviewers = processed_reviewers; // 社内稟議対応
                                    receiver.Items[0].reviewer = reviewerList; // 社内稟議対応
                                    receiver.Items[0].processed_receivers = processed_receivers; // 複数者間契約対応
                                    receiver.Items[0].receiver = receiverList; // 複数者間契約対応
                                    receiver.Items[0].renderpdf = renderpdf.Items[0].renderpdf;
                                    if (receiver.Items[0].status === "concluded" || receiver.Items[0].status === "dismissal") done(null, receiver);
                                    else if (timestamp() > receiver.Items[0].expiretime) done(null, {
                                        result: "expired",
                                        sender: receiver.Items[0].sender
                                    });
                                    else if (receiver.Items[0].status === "deactive") done(null, {
                                        result: "deactive",
                                        sender: receiver.Items[0].sender
                                    });
                                    else done(null, receiver);
                                });
                            });
                        }
                    });
                }
            });
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

var dynamoQuery = (param) => {
    return new Promise((resolve, reject) => {
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
