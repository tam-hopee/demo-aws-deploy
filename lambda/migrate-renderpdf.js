'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    // データ移行用スクリプト：document-receiver.renderpdfをdocument-renderpdfに移行させる処理
    const tableName = {
        "receiver": process.env.CC_TABLE_RECEIVER,
        "renderpdf": process.env.CC_TABLE_RENDERPDF
    };
    subtaskScan(tableName, 'firsttime');
};

const subtaskScan = (tableName, exclusiveStartKey) => {
    return new Promise((resolve, reject) => {
        if (!exclusiveStartKey) {
            // exclusiveStartKeyがnullならこのサブタスクを完了する
            resolve();
            return;
        }
        const params = {
            TableName: tableName.receiver,
            Limit: 10
        };
        if (exclusiveStartKey !== 'firsttime') {
            // 1回目のscanでなければExclusiveStartKeyを指定する
            params['ExclusiveStartKey'] = exclusiveStartKey;
        }
        dynamo.scan(params, (error, data) => {
            if (error) {
                reject(error);
                return;
            }
            data.Items.forEach(function(result, index) {
                keysGet(tableName.renderpdf, result.key).then((data) => {
                    if (data.Count == 0) {
                        // 新規テーブルにまだデータが移行されていないので、データコピーして元を削除
                        console.log("Data is none.");
                        /*var putitem = {
                            "key": result.key,
                            "renderpdf": result.renderpdf,
                            "createdtime": timestamp(),
                            "timestamp": timestamp(),
                        };
                        putDB(tableName.renderpdf, putitem).then((data) => {
                            var params_receiver = {
                                TableName: tableName.receiver,
                                Key: {
                                    "receiver": result.receiver,
                                    "key": result.key
                                }
                            };
                            params_receiver.UpdateExpression = "remove renderpdf";
                            dynamo.update(params_receiver);
                        });*/
                    } else {
                        // 新規テーブルにデータ移送済み
                        console.log(data.Items[0].key);
                        /*var params_receiver = {
                            TableName: tableName.receiver,
                            Key: {
                                "receiver": result.receiver,
                                "key": result.key
                            }
                        };
                        params_receiver.UpdateExpression = "remove renderpdf";
                        dynamo.update(params_receiver, (error, data) => {
                          if (error) {
                            reject(error);
                            return;
                          }
                        });*/
                    }
                });
            });
            subtaskScan(tableName, data.LastEvaluatedKey)
                // 2回目以降のscanを実行する(再帰的実行)
                .then(resolve)
                // 後続のサブタスクが完了すれば、このサブタスクは完了する
                .catch(reject);
        });
    });
};

var keysGet = (tableName, key) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": key
        };
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val",
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": "key"
            }
        };
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var putDB = (tableName, Item) => {
    return new Promise((resolve, reject) => {
        var params = {
            TableName: tableName,
            Item: Item
        };
        dynamo.put(params, function(err, data) {
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
