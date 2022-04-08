'use strict';
const CryptoJS = require('crypto-js');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? {
        "key": process.env.CC_TABLE_KEY,
        "blockchain": process.env.CC_TABLE_BLOCKCHAIN,
        "auth": process.env.CC_TABLE_AUTH
    } : {
        "key": process.env.CC_TABLE_KEY_DEV,
        "blockchain": process.env.CC_TABLE_BLOCKCHAIN_DEV,
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
        var email = CryptoJS.AES.decrypt(event.params.querystring.receiver, appkey.Items[0].key).toString(CryptoJS.enc.Utf8);
        keyGet(tableName.key, "key", event.params.querystring.key).then((data) => {
            let receiverList = data.Items[0].receiver;
            var isinvalid = true;
            if (typeof receiverList === typeof []) {
                // 配列の場合（＝複数者間契約の実装リリース後に発生するパターン）
                receiverList.forEach(function(val) {
                    if (email === val) isinvalid = false;
                });
            } else {
                if (email === receiverList) isinvalid = false;
            }
            if (isinvalid) done(null, {
                result: "invalid"
            });
            else {
                var values = {
                    ":key": data.Items[0].key
                };
                var param = {
                    TableName: tableName.blockchain,
                    KeyConditionExpression: "#s = :key",
                    ExpressionAttributeValues: values,
                    ExpressionAttributeNames: {
                        "#s": "key"
                    },
                    ScanIndexForward: false
                };
                var isme = (data.Items[0].id == event.context["cognito-identity-id"]) ? true : false;
                dynamo.query(param, function(err, data) {
                    data.Items[0].isme = isme;
                    if (err) done(err, null);
                    else done(null, data);
                });
            }
        });
    });
};


var keyGet = (tableName, name, id) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": id,
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
