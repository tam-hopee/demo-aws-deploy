'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
AWS.config.update({
    region: 'us-west-2'
});
const ses = new AWS.SES();
exports.handler = (event, context, callback) => {
    // blockchain-prepare（storjアップロード前） と blockchain-prepare（storjアップロード済）を比較して、再ランする処理
    // Lambda環境変数によって、スコープを決める（現在時刻からどれだけ遡って検知させるか）。
    const tableName = {
        "blockchain": process.env.CC_TABLE_BLOCKCHAIN,
        "blockchain_prepare": process.env.CC_TABLE_BLOCKCHAIN_PREPARE
    };
    const backminute = process.env.BACK_MINUTE;
    const mailowner = process.env.MAIL_OWNER;
    const maildone = (err, data) => {
        if (err) console.log('ERROR', err);
        else console.log(data);
    };
    var time = (backminute) ? timestamp(backminute) : '19990101000000';
    var params = {
        TableName: tableName.blockchain_prepare,
        ExpressionAttributeNames: {
            '#t': 'createdtime'
        },
        ExpressionAttributeValues: {
            ':val': time
        },
        FilterExpression: '#t >= :val'
    };
    console.log(params);
    dynamo.scan(params, function(err, data) {
        if (err) {
            console.log(err);
        } else {
            data.Items.forEach(function(result, index) {
                blockchainGet(tableName.blockchain, result.key).then((data) => {
                    if (data.Count == 0) {
                        console.log("Recover target key: " + result.key);
                        // 検知メールを送信 -- ここから
                        var maildata = {
                            Destination: {
                                ToAddresses: [mailowner]
                            },
                            Message: {
                                Body: {
                                    Text: {
                                        Data: "ブロックチェーン登録の失敗を検知したので遡求します。\n\n・書類ID：" + result.key +
                                            "\n＿＿＿＿＿＿＿\n\n",
                                        Charset: 'utf-8'
                                    },
                                },
                                Subject: {
                                    Data: 'クラウドコントラクトシステムメール_ブロックチェーン登録失敗',
                                    Charset: 'utf-8'
                                }
                            },
                            Source: "CloudContract <info@cloudcontract.jp>"
                        };
                        ses.sendEmail(maildata, maildone);
                        // 検知メールを送信 -- ここまで

                        var putitem = {
                            "key": result.key,
                            "createdtime": timestamp(),
                            "s3bucket": result.s3bucket,
                            "s3file": result.s3file
                        };
                        var delitem = {
                            TableName: tableName.blockchain_prepare,
                            Key: {
                                "key": result.key,
                                "createdtime": result.createdtime
                            },
                            ConditionExpression: "#k = :val AND #t = :time",
                            ExpressionAttributeNames: {
                                "#k": "key",
                                "#t": "createdtime"
                            },
                            ExpressionAttributeValues: {
                                ":val": result.key,
                                ":time": result.createdtime
                            }
                        };
                        if (!putitem.s3bucket || !putitem.s3file) {
                            // 基本的にはありえない経路なので、スルー
                            console.log('ERROR', 'parameter is null.');
                        } else {
                            putDB(tableName.blockchain_prepare, putitem).then((data) => {
                                console.log("Success");
                                deleteDB(delitem); // 古いデータを削除
                                var mailsuccess = {
                                    Destination: {
                                        ToAddresses: [mailowner]
                                    },
                                    Message: {
                                        Body: {
                                            Text: {
                                                Data: "ブロックチェーン登録の遡求が完了しました。\n\n・書類ID：" + result.key +
                                                    "\n＿＿＿＿＿＿＿\n\n",
                                                Charset: 'utf-8'
                                            },
                                        },
                                        Subject: {
                                            Data: 'クラウドコントラクトシステムメール_ブロックチェーン登録遡求完了',
                                            Charset: 'utf-8'
                                        }
                                    },
                                    Source: "CloudContract <info@cloudcontract.jp>"
                                };
                                ses.sendEmail(mailsuccess, maildone);
                            }).catch((err) => {
                                console.log('ERROR', err.message);
                                var mailerror = {
                                    Destination: {
                                        ToAddresses: [mailowner]
                                    },
                                    Message: {
                                        Body: {
                                            Text: {
                                                Data: "ブロックチェーン登録の遡求に失敗しました。\n\n・書類ID：" + result.key +
                                                    "\nERROR: " + err.message +
                                                    "\n＿＿＿＿＿＿＿\n\n",
                                                Charset: 'utf-8'
                                            },
                                        },
                                        Subject: {
                                            Data: 'クラウドコントラクトシステムメール_ブロックチェーン登録遡求失敗',
                                            Charset: 'utf-8'
                                        }
                                    },
                                    Source: "CloudContract <info@cloudcontract.jp>"
                                };
                                ses.sendEmail(mailerror, maildone);
                            });
                        }
                    }
                }).catch((err) => {
                    console.log('ERROR', err.message);
                });
            });
        }
    });
};

var deleteDB = (params) => {
    return new Promise((resolve, reject) => {
        dynamo.delete(params, function(err, data) {
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

var blockchainGet = (tableName, key) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": key,
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

var timestamp = (backminute) => {
    process.env.TZ = 'Asia/Tokyo';
    var dt = new Date();
    if (backminute) {
        dt.setMinutes(dt.getMinutes() - backminute);
    }
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
