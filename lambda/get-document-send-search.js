'use strict';
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
	region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
	var tableName = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
	var usertableName = (event.context.stage == "prod") ? process.env.CC_USER_TABLE : process.env.CC_USER_TABLE_DEV;
	var keyword = event.params.querystring.keyword;
	
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
		var params = {
			TableName: tableName,
			KeyConditionExpression: "#k = :val",
			FilterExpression: "#s= :status",
			ExpressionAttributeNames: {"#k": "id", "#s": "status"},
			ExpressionAttributeValues: {":val": currentId, ":status": 'concluded'}
		};
		var res = [];
		dynamo.query(params, function (err, data) {
			if (err) {
				console.log(err);
			} else {
				console.log(JSON.stringify(data));
				data.Items.forEach(function (item, index) {
					if (existsReceiver(item['receiver'], keyword) || item['filename'].indexOf(keyword) !== -1) {
						res.push(item);
					}
				});
			}
			callback(null, {
				statusCode: err ? '400' : '200',
				body: err ? err.message : JSON.stringify(res),
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		});
	});
	
};

function existsReceiver(receiver, keyword) {
	var exists = false;
	if (typeof receiver === typeof []) {
		receiver.some(function (val) {
			if(val.indexOf(keyword) !== -1) {
				exists = true;
				return true;
			}
		});
	} else {
		if(receiver.indexOf(keyword) !== -1) {
			exists = true;
			return true;
		}
	}
	return exists;
}
