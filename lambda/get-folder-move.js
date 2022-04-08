'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});

exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? process.env.CC_FOLDER_TABLE : process.env.CC_FOLDER_TABLE_DEV;
    var usertableName = (event.context.stage == "prod") ? process.env.CC_USER_TABLE : process.env.CC_USER_TABLE_DEV;
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
        TableName: usertableName,
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
        var result = [];
        var index = 0;
        var folderGet = (tableName, uid, fid) => {
            var param = {
                TableName: tableName,
                KeyConditionExpression: "#k = :val",
                FilterExpression: "#f = :folderid",
                ExpressionAttributeValues: {
                    ":val": uid,
                    ":folderid": fid
                },
                ExpressionAttributeNames: {
                    "#k": "id",
                    "#f": "folderid"
                }
            };
            dynamo.query(param, function (err, data) {
                if (err) done(err, null);
                else {
                    var res = data.Items[0];
                    result[index] = {
                        id: res.folderid,
                        name: res.foldername,
                        tab: res.tab,
                        status: res.status
                    };
                    // 親フォルダが削除状態であれば、その情報を返す。
                    if (index > 0 && res.status === "deactive") {
                        var warninfo = [];
                        warninfo[0] = {
                            result: "warning",
                            message: "Parent Folder [" + res.foldername + "] is removed.",
                            targetfoldername: res.foldername
                        };
                        done(null, warninfo);
                    }
                    if (res.parentfolderid) {
                        // 親フォルダの情報を取得
                        index += 1;
                        folderGet(tableName, uid, res.parentfolderid);
                    } else {
                        // ルートにたどり着いたら結果を返す。
                        done(null, result);
                    }
                }
            });
        };
    
        var userid = currentId;
        var folderid = event.params.querystring.folderid;
        folderGet(tableName, userid, folderid);
    });
};
