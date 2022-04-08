'use strict';
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
	region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
	var tableName = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
	var usertableName = (event.context.stage == "prod") ? process.env.CC_USER_TABLE : process.env.CC_USER_TABLE_DEV;
	var key = event.params.querystring.key;
	
	var userExpressionAttributeValues = {
		":val": event.context['cognito-identity-id']
	};
	var userExpressionAttributeValues = {
		TableName: usertableName,
		KeyConditionExpression: "#k = :val",
		ExpressionAttributeValues: userExpressionAttributeValues,
		ExpressionAttributeNames: {
			"#k": "id"
		}
	};
	// Get the currentId to check if the user is switching.
	dynamo.query(userExpressionAttributeValues, function (err, data) {
		var currentId = event.context['cognito-identity-id']
		if (data.Items[0].currentId) {
			currentId = data.Items[0].currentId
		}
		console.log("currentId is:" + currentId)
		
		var params = {
			TableName: tableName,
			Key: {
				"id": currentId,
				"key": key
			},
		};
		dynamo.get(params, function (err, data) {
			if (err) {
				console.log(err);
			}
			callback(null, {
				statusCode: err ? '400' : '200',
				body: err ? err.message : JSON.stringify(data),
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		});
	});
};
