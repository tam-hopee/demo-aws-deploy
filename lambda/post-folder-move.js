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
        "original": process.env.CC_TABLE_ORIGINAL,
        "folders": process.env.CC_TABLE_FOLDERS,
        "auth": process.env.CC_TABLE_AUTH,
		"user": process.env.CC_USER_TABLE
    } : {
        "key": process.env.CC_TABLE_KEY_DEV,
        "send": process.env.CC_TABLE_SEND_DEV,
        "receiver": process.env.CC_TABLE_RECEIVER_DEV,
        "original": process.env.CC_TABLE_ORIGINAL_DEV,
        "folders": process.env.CC_TABLE_FOLDERS_DEV,
        "auth": process.env.CC_TABLE_AUTH_DEV,
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
	keyGet(tableName.user, "id", event.context['cognito-identity-id']).then((userData) => { // Get the currentId to check if the user is switching.
		var currentId = event.context['cognito-identity-id']
		if (userData.Items[0].currentId) {
			currentId = userData.Items[0].currentId
		}
		console.log("currentId is:" + currentId)
		if (event['body-json'].type === "folder") {
			var uid = currentId;
			var departureFolderId = event['body-json'].key
			var destinationFolderId = event['body-json'].folderid;
			var isroot = (!destinationFolderId || destinationFolderId === '') ? true : false;
			var param = {
				TableName: tableName.folders,
				KeyConditionExpression: "#k = :val",
				FilterExpression: "#f = :folderid",
				ExpressionAttributeValues: {
					":val": uid,
					":folderid": departureFolderId
				},
				ExpressionAttributeNames: {
					"#k": "id",
					"#f": "folderid"
				}
			};
			dynamo.query(param, function (err, data) {
				if (err) {
					return done(err, null);
				} else {
					var res = data.Items[0];
					var params_folder = {
						TableName: tableName.folders,
						Key: {
							"id": res["id"],
							"createdtime": res["createdtime"]
						}
					};
					if (isroot) {
						params_folder.UpdateExpression = "remove parentfolderid";
					} else {
						params_folder.ExpressionAttributeNames = {
							"#p": "parentfolderid"
						};
						params_folder.ExpressionAttributeValues = {
							":np": destinationFolderId
						};
						params_folder.UpdateExpression = "set #p = :np";
					}
					var updateFolderTable = function () {
						return new Promise((resolve, reject) => {
							dynamo.update(params_folder, function (err, data) {
								console.log("UPDATE:" + params_folder.TableName);
								if (err) reject(err);
								else resolve(data);
							});
						});
					};
					updateFolderTable().then(done(null, {
						result: "success"
					}));
				}
			});
			return done(null, {result: "Finish"});
		}
		if (event['body-json'].tab == "upload") {
			// アップロード一覧ファイルのフォルダ移動
			var isroot = (!event['body-json'].folderid || event['body-json'].folderid === '') ? true : false;
			var params_original = {
				TableName: tableName.original,
				Key: {
					"id": currentId,
					"etag": event['body-json'].key
				}
			};
			if (isroot) {
				params_original.UpdateExpression = "remove folderid";
			} else {
				params_original.UpdateExpression = "set #folderid = :f";
				params_original.ExpressionAttributeNames = {
					"#folderid": "folderid"
				};
				params_original.ExpressionAttributeValues = {
					":f": event['body-json'].folderid
				};
			}
			var updateOriginalTable = function () {
				return new Promise((resolve, reject) => {
					dynamo.update(params_original, function (err, data) {
						console.log("UPDATE:" + params_original.TableName);
						if (err) reject(err);
						else resolve(data);
					});
				});
			};
			updateOriginalTable().then(done(null, {
				result: "success"
			}));
		}
		
		keyGet(tableName.key, "key", event['body-json'].key).then((data) => {
			var res = data.Items[0];
			var isroot = (!event['body-json'].folderid || event['body-json'].folderid === '') ? true : false;
			if (event['body-json'].tab == "sender") {
				// 送信者側のディレクトリ移動
				var params_send = {
					TableName: tableName.send,
					Key: {
						"id": res.id,
						"key": res.key
					}
				};
				if (isroot) {
					params_send.UpdateExpression = "remove folderid";
				} else {
					params_send.UpdateExpression = "set #folderid = :f";
					params_send.ExpressionAttributeNames = {
						"#folderid": "folderid"
					};
					params_send.ExpressionAttributeValues = {
						":f": event['body-json'].folderid
					};
				}
				var updateSendTable = function () {
					return new Promise((resolve, reject) => {
						dynamo.update(params_send, function (err, data) {
							console.log("UPDATE:" + params_send.TableName);
							if (err) reject(err);
							else resolve(data);
						});
					});
				};
				updateSendTable().then(done(null, {
					result: "success"
				}));
			}
			if (event['body-json'].tab == "receiver") {
				keyGet(tableName.auth, "id", "appkey").then((appkey) => { // アプリ共通 復号キー取得
					var email = CryptoJS.AES.decrypt(event['body-json'].receiver, appkey.Items[0].key).toString(CryptoJS.enc.Utf8);
					// 受信者側のディレクトリ移動
					var params_receiver = {
						TableName: tableName.receiver,
						Key: {
							"receiver": email,
							"key": res.key
						}
					};
					if (isroot) {
						params_receiver.UpdateExpression = "remove folderid";
					} else {
						params_receiver.UpdateExpression = "set #folderid = :f";
						params_receiver.ExpressionAttributeNames = {
							"#folderid": "folderid"
						};
						params_receiver.ExpressionAttributeValues = {
							":f": event['body-json'].folderid
						};
					}
					var updateReceiverTable = function () {
						return new Promise((resolve, reject) => {
							dynamo.update(params_receiver, function (err, data) {
								console.log("UPDATE:" + params_receiver.TableName);
								if (err) reject(err);
								else resolve(data);
							});
						});
					};
					updateReceiverTable().then(done(null, {
						result: "success"
					}));
				});
			}
		});
	});
};
