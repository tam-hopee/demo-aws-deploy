'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
AWS.config.update({
    region: 'us-west-2'
});
const SES = new AWS.SES();
exports.handler = (event, context, callback) => {
    const TABLENAME = (event.context.stage == "prod") ? {
        "send": process.env.CC_TABLE_SEND,
        "keys": process.env.CC_TABLE_KEYS,
        "user": process.env.CC_USER_TABLE
    } : {
        "send": process.env.CC_TABLE_SEND_DEV,
        "keys": process.env.CC_TABLE_KEYS_DEV,
        "user": process.env.CC_USER_TABLE_DEV
    };
    const domain = (event.context.stage == "prod") ? process.env.CC_DOMAIN : process.env.CC_DOMAIN_DEV;
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    var userExpressionAttributeValues = {
        ":val": event.context['cognito-identity-id']
    };
    var user_param = {
        TableName: TABLENAME.user,
        KeyConditionExpression: "#k = :val",
        ExpressionAttributeValues: userExpressionAttributeValues,
        ExpressionAttributeNames: {
            "#k": "id"
        }
    };
    // Get the currentId to check if the user is switching.
    dynamo.query(user_param, function (err, data) {
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        console.log("currentId is:" + currentId)
        var result = {};
        var requests = event['body-json'].keys.map((key) => {
            return new Promise((resolve, reject) => {
                keyGet(TABLENAME.keys, "key", key).then((keydata) => {
                    if (keydata.Items[0].status == "review") {
                        documentSendGet(TABLENAME.send, currentId, key).then((data) => {
                            result.sender = data.Items[0].sender;
                            result.filename = data.Items[0].filename;
                            ses2reviewer(domain, data.Items[0], keydata.Items[0].reviewers).then((res) => {
                                resolve(res);
                            });
                        }).catch((err) => {
                            reject(err.message);
                        });
                    }
                });
            });
        });
        Promise.all(requests).then(() => {
            return new Promise((resolve, reject) => {
                ses2sender(domain, result).then((data) => {
                    resolve(data);
                    done(null, data);
                }).catch((err) => {
                    reject(err.message);
                    done(err, null);
                });
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

var documentSendGet = (tableName, id, key) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": id,
            ":key": key
        };
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val AND #s = :key",
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": "id",
                "#s": "key"
            }
        };
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var ses2reviewer = (domain, data, reviewers) => {
    return new Promise((resolve, reject) => {
        var params = {
            Destination: {
                ToAddresses: reviewers
            },
            Message: {
                Body: {
                    Text: {
                        Data: "書類の確認依頼が届きました。\nご確認をお願いいたします。" +
                            "\n\n・送信元メールアドレス：" + data.sender +
                            "\n・送付先メールアドレス：" + arrayToString(data.receiver) +
                            "\n・書類名：" + data.filename +
                            "\n・確認用URL：" + domain + "preview.html?key=" + data.key +
                            "\n・URL有効期限：" + timestampConvertor(data.expiretime) +
                            "\n\n社内確認に設定された全員が確認・合意した場合のみ書類が送付先へ送信されます。" +
                            "\n\n＿＿＿＿＿＿\n" +
                            "\n本メールは送信専用のため、ご返信に対応する事はできません。" +
                            "\n本メールに心あたりがない場合は削除をお願いいたします。" +
                            "\n誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。" +
                            "\n＿＿＿＿＿＿＿\n" +
                            "\n＊クラウドコントラクトの推奨ブラウザはGoogle Chromeとなっております。\n\n",
                        Charset: 'utf-8'
                    },
                    /*Html: {
                      Data: '',
                      Charset : 'utf-8'
                    }*/
                },
                Subject: {
                    Data: '【社内確認】「' + data.filename + '」の確認依頼が届いております。',
                    Charset: 'utf-8'
                }
            },
            Source: "CloudContract <info@cloudcontract.jp>"
        };
        SES.sendEmail(params, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var ses2sender = (domain, data) => {
    return new Promise((resolve, reject) => {
        var params = {
            Destination: {
                ToAddresses: [data.sender]
            },
            Message: {
                Body: {
                    Text: {
                        Data: "書類の確認依頼を送付しました。" +
                            "\n\n・書類名：" + data.filename +
                            "\n・契約書一覧確認画面：" + domain + "review.html" +
                            "\n\n 上記URLよりご確認ください。" +
                            "\n\n＿＿＿＿＿＿\n" +
                            "\n本メールは送信専用のため、ご返信に対応する事はできません。" +
                            "\n本メールに心あたりがない場合は削除をお願いいたします。" +
                            "\n誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。" +
                            "\n＿＿＿＿＿＿＿\n\n",
                        Charset: 'utf-8'
                    },
                    /*Html: {
                      Data: '',
                      Charset : 'utf-8'
                    }*/
                },
                Subject: {
                    Data: '【社内確認】「' + data.filename + '」の確認依頼を送付しました。',
                    Charset: 'utf-8'
                }
            },
            Source: "CloudContract <info@cloudcontract.jp>"
        };
        SES.sendEmail(params, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var timestampConvertor = (timestamp) => {
    var year = timestamp.substr(0, 4);
    var month = timestamp.substr(4, 2);
    var day = timestamp.substr(6, 2);
    var hour = timestamp.substr(8, 2);
    var minute = timestamp.substr(10, 2);
    var second = timestamp.substr(12, 2);
    return String(year) + "/" + String(month) + "/" + String(day) + " " + String(hour) + ":" + String(minute);
};

var arrayToString = (array) => {
    var res = '';
    var sep = ' , ';
    array.forEach(function(val) {
        res += val + sep;
    });
    return res.slice(0, -(sep.length));
};
