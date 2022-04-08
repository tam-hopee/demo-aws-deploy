'use strict';
const CryptoJS = require('crypto-js');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? {
        "key": process.env.CC_TABLE_KEY,
        "send": process.env.CC_TABLE_SEND,
        "receiver": process.env.CC_TABLE_RECEIVER,
        "renderpdf": process.env.CC_TABLE_RENDERPDF,
        "auth": process.env.CC_TABLE_AUTH
    } : {
        "key": process.env.CC_TABLE_KEY_DEV,
        "send": process.env.CC_TABLE_SEND_DEV,
        "receiver": process.env.CC_TABLE_RECEIVER_DEV,
        "renderpdf": process.env.CC_TABLE_RENDERPDF_DEV,
        "auth": process.env.CC_TABLE_AUTH_DEV
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
        var receiver = CryptoJS.AES.decrypt(event['body-json'].receiver, appkey.Items[0].key).toString(CryptoJS.enc.Utf8);
        var postStatus = event['body-json'].status;
        keyGet(tableName.key, "key", event['body-json'].key).then((data) => {
            var res = data.Items[0];
            var processed_receivers = [];
            if (res.processed_receivers) {
                // 承認状態の確認
                res.processed_receivers.forEach(function(val) {
                    processed_receivers.push(val);
                    if (val.status === "dismissal") {
                        // 一つでも却下がある場合、postStatusは却下にしておく（複数契約の場合、却下状態の方が締結状態より優先）。
                        postStatus = "dismissal";
                    }
                });
            }
            processed_receivers.push({
                "receiver": receiver,
                "status": event['body-json'].status,
                "timestamp": timestamp()
            });

            // 承認状態の判定
            if (typeof res.receiver === typeof []) {
                // 配列の場合（＝複数者間契約の実装リリース後に発生するパターン）
                if (res.receiver.length !== processed_receivers.length) {
                    /// 受信者数と締結者数が等しくない場合、送信状態にする。
                    postStatus = "sent";
                }
            }

            if (data.Items[0].status !== "sent") {
                done(null, {
                    result: "invalid",
                    status: data.Items[0].status
                });
                return null;
            }
            var params_send = {
                TableName: tableName.send,
                Key: {
                    "id": res.id,
                    "key": res.key
                },
                UpdateExpression: "set #status = :s, #timestamp = :t",
                ExpressionAttributeNames: {
                    "#status": "status",
                    "#timestamp": "timestamp"
                },
                ExpressionAttributeValues: {
                    ":s": postStatus,
                    ":t": timestamp()
                }
            };
            var params_receiver = {
                TableName: tableName.receiver,
                Key: {
                    "receiver": receiver,
                    "key": res.key
                },
                UpdateExpression: "set #status = :s, #timestamp = :t",
                ExpressionAttributeNames: {
                    "#status": "status",
                    "#timestamp": "timestamp"
                },
                ExpressionAttributeValues: {
                    ":s": event['body-json'].status, // 自分の承認状態ステータスはリクエスト値のままセットする。
                    ":t": timestamp()
                }
            };
            var params_key = {
                TableName: tableName.key,
                Key: {
                    "key": res.key
                },
                UpdateExpression: "set #status = :s, #timestamp = :t, #processed_receivers = :c",
                ExpressionAttributeNames: {
                    "#status": "status",
                    "#timestamp": "timestamp",
                    "#processed_receivers": "processed_receivers"
                },
                ExpressionAttributeValues: {
                    ":s": postStatus,
                    ":t": timestamp(),
                    ":c": processed_receivers
                }
            };
            var params_renderpdf = {
                TableName: tableName.renderpdf,
                Key: {
                    "key": res.key
                },
                UpdateExpression: "set #timestamp = :t, #renderpdf = :r",
                ExpressionAttributeNames: {
                    "#timestamp": "timestamp",
                    "#renderpdf": "renderpdf"
                },
                ExpressionAttributeValues: {
                    ":t": timestamp(),
                    ":r": event['body-json'].renderpdf
                }
            };
            var updateSendTable = function() {
                return new Promise((resolve, reject) => {
                    dynamo.update(params_send, function(err, data) {
                        console.log("UPDATE:" + params_send.TableName);
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
            };
            var updateReceiverTable = function() {
                return new Promise((resolve, reject) => {
                    dynamo.update(params_receiver, function(err, data) {
                        console.log("UPDATE:" + params_receiver.TableName);
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
            };
            var updateKeysTable = function() {
                return new Promise((resolve, reject) => {
                    dynamo.update(params_key, function(err, data) {
                        console.log("UPDATE:" + params_key.TableName);
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
            };
            var updateRenderpdfTable = function() {
                return new Promise((resolve, reject) => {
                    dynamo.update(params_renderpdf, function(err, data) {
                        console.log("UPDATE:" + params_renderpdf.TableName);
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
            };
            updateSendTable()
                .then(updateReceiverTable)
                .then(updateKeysTable)
                .then(updateRenderpdfTable)
                .then(done(null, {
                    result: "success"
                }));
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
