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
        "reviewer": process.env.CC_TABLE_REVIEWER,
        "auth": process.env.CC_TABLE_AUTH
    } : {
        "key": process.env.CC_TABLE_KEY_DEV,
        "send": process.env.CC_TABLE_SEND_DEV,
        "receiver": process.env.CC_TABLE_RECEIVER_DEV,
        "reviewer": process.env.CC_TABLE_REVIEWER_DEV,
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
    // 必須リクエストパラメーター： reviewer, status, key
    keyGet(tableName.auth, "id", "appkey").then((appkey) => { // アプリ共通 復号キー取得
        var reviewer = CryptoJS.AES.decrypt(event['body-json'].reviewer, appkey.Items[0].key).toString(CryptoJS.enc.Utf8);
        var postStatus = event['body-json'].status;
        keyGet(tableName.key, "key", event['body-json'].key).then((data) => {
            var res = data.Items[0];
            if (res.status !== "review") {
                // レビューステータスではない処理の場合は想定外エラー
                done(null, {
                    result: "invalid",
                    status: data.Items[0].status
                });
                return null;
            }
            var processed_reviewers = [];
            if (res.processed_reviewers) {
                // 承認状態の確認
                res.processed_reviewers.forEach(function(val) {
                    processed_reviewers.push(val);
                    if (val.status === "reject") {
                        // 一つでも社内却下がある場合、postStatusは社内却下にしておく。
                        postStatus = "reject";
                    }
                });
            }
            if (event['body-json'].comment !== "" && event['body-json'].comment) {
                // コメントがある場合
                processed_reviewers.push({
                    "reviewer": reviewer,
                    "status": event['body-json'].status,
                    "comment": event['body-json'].comment,
                    "timestamp": timestamp()
                });
            } else {
                // コメントがない場合
                processed_reviewers.push({
                    "reviewer": reviewer,
                    "status": event['body-json'].status,
                    "timestamp": timestamp()
                });
            }
            // 承認状態の判定
            if (res.reviewers.length !== processed_reviewers.length) {
                // 確認者数とレビュー済数が等しくない（＝まだ全員の確認が終わっていない）場合、レビュー状態にする。
                postStatus = "review";
            } else {
                // 確認者全員のレビューが終わっている場合の処理
                if (postStatus !== "reject") {
                    // 社内却下でなければ、送付状態のステータスとする。
                    postStatus = "sent";
                }
            }
            // 各テーブル更新用の変数設定
            var params_send = {
                TableName: tableName.send,
                Key: {
                    "id": res.id,
                    "key": res.key
                },
                UpdateExpression: "set #status = :s, #timestamp = :t, #reviewedtime = :r",
                ExpressionAttributeNames: {
                    "#status": "status",
                    "#timestamp": "timestamp",
                    "#reviewedtime": "reviewedtime"
                },
                ExpressionAttributeValues: {
                    ":s": postStatus,
                    ":t": timestamp(),
                    ":r": timestamp()
                }
            };
            var params_receiver = {
                TableName: tableName.receiver,
                Key: {
                    // "receiver": set updateReceiverTable function();
                    "key": res.key
                },
                UpdateExpression: "set #status = :s, #timestamp = :t, #reviewedtime = :r",
                ExpressionAttributeNames: {
                    "#status": "status",
                    "#timestamp": "timestamp",
                    "#reviewedtime": "reviewedtime"
                },
                ExpressionAttributeValues: {
                    ":s": postStatus,
                    ":t": timestamp(),
                    ":r": timestamp()
                }
            };
            var params_reviewer = {
                TableName: tableName.reviewer,
                Key: {
                    "reviewer": reviewer,
                    "key": res.key
                },
                UpdateExpression: "set #status = :s, #timestamp = :t",
                ExpressionAttributeNames: {
                    "#status": "status",
                    "#timestamp": "timestamp"
                },
                ExpressionAttributeValues: {
                    ":s": event['body-json'].status,
                    ":t": timestamp()
                }
            };
            var params_key = {
                TableName: tableName.key,
                Key: {
                    "key": res.key
                },
                UpdateExpression: "set #status = :s, #timestamp = :t, #processed_reviewers = :c",
                ExpressionAttributeNames: {
                    "#status": "status",
                    "#timestamp": "timestamp",
                    "#processed_reviewers": "processed_reviewers"
                },
                ExpressionAttributeValues: {
                    ":s": postStatus,
                    ":t": timestamp(),
                    ":c": processed_reviewers
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
            var updateReceiverTable = res.receiver.map((val) => {
                params_receiver.Key.receiver = val;
                return new Promise((resolve, reject) => {
                    dynamo.update(params_receiver, function(err, data) {
                        console.log("UPDATE:" + params_receiver.TableName + ", receiver:" + val);
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
            });
            var updateReviewerTable = function() {
                return new Promise((resolve, reject) => {
                    dynamo.update(params_reviewer, function(err, data) {
                        console.log("UPDATE:" + params_reviewer.TableName);
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
            updateSendTable()
                .then(updateReceiverTable)
                .then(updateReviewerTable)
                .then(updateKeysTable)
                .then(done(null, {
                    result: "success",
                    status: postStatus
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
