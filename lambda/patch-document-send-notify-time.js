'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
	region: 'ap-northeast-1',
	convertEmptyValues: true
});
exports.handler = (event, context, callback) => {
	console.log('Received event:', JSON.stringify(event, null, 2));
	var tableName = (event.context.stage == "prod") ? {
		"send": process.env.CC_TABLE_SEND,
		"keys": process.env.CC_TABLE_KEYS,
		"user": process.env.CC_USER_TABLE
	} : {
		"send": process.env.CC_TABLE_SEND_DEV,
		"keys": process.env.CC_TABLE_KEYS_DEV,
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
	
	let endTime = event['body-json'].endTime;
	let alertTime = event['body-json'].alertTime;
	
	keyGet(tableName.user, "id", event.context['cognito-identity-id']).then((userData) => { // Get the currentId to check if the user is switching.
		var currentId = event.context['cognito-identity-id']
		if (userData.Items[0].currentId) {
			currentId = userData.Items[0].currentId
		}
		console.log("currentId is:" + currentId)
		keyGet(tableName.keys, "key", event['body-json'].docId).then((data) => {
			var res = data.Items[0];
			var params_send = {
				TableName: tableName.send,
				Key:{
					"id": currentId,
					"key": res.key
				},
				UpdateExpression:"set endtime = :endtime, alerttime = :alerttime",
				ExpressionAttributeValues: {
					":endtime": endTime ? timestamp(endTime) : "",
					":alerttime": alertTime ? timestamp(alertTime) : ""
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
			updateSendTable()
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

var timestamp = (targetDate) => {
	process.env.TZ = 'Asia/Tokyo';
	var dt = new Date(targetDate);
	var year = dt.getFullYear();
	var month = dt.getMonth() + 1;
	var day = dt.getDate();
	if (month < 10) month = '0' + month;
	if (day < 10) day = '0' + day;
	return String(year) + String(month) + String(day);
};
