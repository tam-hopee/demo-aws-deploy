/*
 * Copyright 2010-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

var apigClientFactory = {};
apigClientFactory.newClient = function (config) {
    var apigClient = { };
    if(config === undefined) {
        config = {
            accessKey: '',
            secretKey: '',
            sessionToken: '',
            region: '',
            apiKey: undefined,
            defaultContentType: 'application/json',
            defaultAcceptType: 'application/json'
        };
    }
    if(config.accessKey === undefined) {
        config.accessKey = '';
    }
    if(config.secretKey === undefined) {
        config.secretKey = '';
    }
    if(config.apiKey === undefined) {
        config.apiKey = '';
    }
    if(config.sessionToken === undefined) {
        config.sessionToken = '';
    }
    if(config.region === undefined) {
        config.region = 'us-east-1';
    }
    //If defaultContentType is not defined then default to application/json
    if(config.defaultContentType === undefined) {
        config.defaultContentType = 'application/json';
    }
    //If defaultAcceptType is not defined then default to application/json
    if(config.defaultAcceptType === undefined) {
        config.defaultAcceptType = 'application/json';
    }

    
    // extract endpoint and path from url
    var invokeUrl = 'https://api.cloudcontract.jp/v0';
    var endpoint = /(^https?:\/\/[^\/]+)/g.exec(invokeUrl)[1];
    var pathComponent = invokeUrl.substring(endpoint.length);

    var sigV4ClientConfig = {
        accessKey: config.accessKey,
        secretKey: config.secretKey,
        sessionToken: config.sessionToken,
        serviceName: 'execute-api',
        region: config.region,
        endpoint: endpoint,
        defaultContentType: config.defaultContentType,
        defaultAcceptType: config.defaultAcceptType
    };

    var authType = 'NONE';
    if (sigV4ClientConfig.accessKey !== undefined && sigV4ClientConfig.accessKey !== '' && sigV4ClientConfig.secretKey !== undefined && sigV4ClientConfig.secretKey !== '') {
        authType = 'AWS_IAM';
    }

    var simpleHttpClientConfig = {
        endpoint: endpoint,
        defaultContentType: config.defaultContentType,
        defaultAcceptType: config.defaultAcceptType
    };

    var apiGatewayClient = apiGateway.core.apiGatewayClientFactory.newClient(simpleHttpClientConfig, sigV4ClientConfig);
    
    
    
    apigClient.appkeyGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var appkeyGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/appkey').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(appkeyGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.appkeyOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var appkeyOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/appkey').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(appkeyOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['key', 'receiver'], ['body']);
        
        var blockchainGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['key', 'receiver']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var blockchainOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainAuthGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['key'], ['body']);
        
        var blockchainAuthGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain/auth').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['key']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainAuthGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainAuthOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var blockchainAuthOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain/auth').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainAuthOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainDownloadPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var blockchainDownloadPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain/download').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainDownloadPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainDownloadOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var blockchainDownloadOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain/download').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainDownloadOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainPreparePost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var blockchainPreparePostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain/prepare').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainPreparePostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainPrepareOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var blockchainPrepareOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain/prepare').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainPrepareOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainUploadPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var blockchainUploadPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain/upload').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainUploadPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.blockchainUploadOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var blockchainUploadOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/blockchain/upload').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(blockchainUploadOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/document').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentCountGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['type'], ['body']);
        
        var documentCountGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/document/count').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['type']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentCountGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentCountOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentCountOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/count').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentCountOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentKeysGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['key', 'authkey', 'verifycode', 'receiver'], ['body']);
        
        var documentKeysGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/document/keys').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['key', 'authkey', 'verifycode', 'receiver']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentKeysGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentKeysOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentKeysOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/keys').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentKeysOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentKeysAuthGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['key', 'receiver'], ['body']);
        
        var documentKeysAuthGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/document/keys/auth').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['key', 'receiver']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentKeysAuthGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentKeysAuthOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentKeysAuthOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/keys/auth').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentKeysAuthOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentOriginalGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['etag', 'folderid', 'status'], ['body']);
        
        var documentOriginalGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/document/original').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['etag', 'folderid', 'status']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentOriginalGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentOriginalPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentOriginalPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/document/original').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentOriginalPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentOriginalOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentOriginalOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/original').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentOriginalOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentPrepareGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['status'], ['body']);
        
        var documentPrepareGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/document/prepare').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['status']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentPrepareGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentPreparePost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentPreparePostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/document/prepare').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentPreparePostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentPrepareOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentPrepareOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/prepare').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentPrepareOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentProcessedPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentProcessedPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/document/processed').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentProcessedPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentProcessedOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentProcessedOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/processed').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentProcessedOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentReceiverGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['folderid', 'status', 'key'], ['body']);
        
        var documentReceiverGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/document/receiver').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['folderid', 'status', 'key']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentReceiverGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentReceiverOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentReceiverOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/receiver').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentReceiverOptionsRequest, authType, additionalParams, config.apiKey);
    };

	apigClient.documentReceiverSearchGet = function (params, body, additionalParams) {
		if(additionalParams === undefined) { additionalParams = {}; }
		
		apiGateway.core.utils.assertParametersDefined(params, ['keyword'], ['body']);
		
		var documentReceiverSearchGetRequest = {
			verb: 'get'.toUpperCase(),
			path: pathComponent + uritemplate('/document/receiver/search').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
			headers: apiGateway.core.utils.parseParametersToObject(params, []),
			queryParams: apiGateway.core.utils.parseParametersToObject(params, ['keyword']),
			body: body
		};
		
		return apiGatewayClient.makeRequest(documentReceiverSearchGetRequest, authType, additionalParams, config.apiKey);
	};

    apigClient.documentReviewerGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['status', 'key'], ['body']);
        
        var documentReviewerGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/document/reviewer').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['status', 'key']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentReviewerGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentReviewerPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentReviewerPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/document/reviewer').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentReviewerPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentReviewerOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentReviewerOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/reviewer').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentReviewerOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentReviewerDelete = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentReviewDeleteRequest = {
            verb: 'delete'.toUpperCase(),
            path: pathComponent + uritemplate('/document/reviewer').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        return apiGatewayClient.makeRequest(documentReviewDeleteRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentSendGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['folderid', 'status'], ['body']);
        
        var documentSendGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/document/send').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['folderid', 'status']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentSendGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentSendPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentSendPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/document/send').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentSendPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentSendDelete = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentSendDeleteRequest = {
            verb: 'delete'.toUpperCase(),
            path: pathComponent + uritemplate('/document/send').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentSendDeleteRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentSendPatch = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentSendPatchRequest = {
            verb: 'patch'.toUpperCase(),
            path: pathComponent + uritemplate('/document/send').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentSendPatchRequest, authType, additionalParams, config.apiKey);
    };

    
    apigClient.documentSendNotifyTimePatch = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentSendNotifyTimePatchRequest = {
            verb: 'patch'.toUpperCase(),
            path: pathComponent + uritemplate('/document/send/notify-time').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        return apiGatewayClient.makeRequest(documentSendNotifyTimePatchRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.documentSendOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentSendOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/send').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentSendOptionsRequest, authType, additionalParams, config.apiKey);
    };
	
	apigClient.documentSendSearchGet = function (params, body, additionalParams) {
		if(additionalParams === undefined) { additionalParams = {}; }
		
		apiGateway.core.utils.assertParametersDefined(params, ['keyword'], ['body']);
		
		var documentSendSearchGetRequest = {
			verb: 'get'.toUpperCase(),
			path: pathComponent + uritemplate('/document/send/search').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
			headers: apiGateway.core.utils.parseParametersToObject(params, []),
			queryParams: apiGateway.core.utils.parseParametersToObject(params, ['keyword']),
			body: body
		};
		
		return apiGatewayClient.makeRequest(documentSendSearchGetRequest, authType, additionalParams, config.apiKey);
	};
    
    
    apigClient.documentSendDetailGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['key'], ['body']);
        
        var documentSendDetailGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/document/send/detail').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['key']),
            body: body
        };
        
        return apiGatewayClient.makeRequest(documentSendDetailGetRequest, authType, additionalParams, config.apiKey);
    };


    apigClient.documentUrlPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentUrlPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/document/url').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentUrlPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.documentUrlOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var documentUrlOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/document/url').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(documentUrlOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.folderGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['status', 'tab', 'parentfolderid'], ['body']);
        
        var folderGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/folder').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['status', 'tab', 'parentfolderid']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(folderGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.folderPut = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var folderPutRequest = {
            verb: 'put'.toUpperCase(),
            path: pathComponent + uritemplate('/folder').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(folderPutRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.folderPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var folderPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/folder').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(folderPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.folderOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var folderOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/folder').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(folderOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.folderMoveGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, ['folderid'], ['body']);
        
        var folderMoveGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/folder/move').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, ['folderid']),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(folderMoveGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.folderMovePost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var folderMovePostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/folder/move').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(folderMovePostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.folderMoveOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var folderMoveOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/folder/move').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(folderMoveOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.pdfPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var pdfPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/pdf').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(pdfPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.pdfOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var pdfOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/pdf').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(pdfOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.pdfGeneratePost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var pdfGeneratePostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/pdf/generate').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(pdfGeneratePostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.pdfGenerateOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var pdfGenerateOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/pdf/generate').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(pdfGenerateOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailAuthPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailAuthPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail/auth').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailAuthPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailAuthOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailAuthOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail/auth').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailAuthOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailReviewedPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailReviewedPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail/reviewed').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailReviewedPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailReviewedOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailReviewedOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail/reviewed').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailReviewedOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailReviewerPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailReviewerPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail/reviewer').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailReviewerPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailReviewerOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailReviewerOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail/reviewer').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailReviewerOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailReviewingPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailReviewingPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail/reviewing').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailReviewingPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.sendmailReviewingOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var sendmailReviewingOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/sendmail/reviewing').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(sendmailReviewingOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.timestampGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var timestampGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/timestamp').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(timestampGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.timestampOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var timestampOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/timestamp').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(timestampOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.userGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var userGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/user').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(userGetRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.userPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var userPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/user').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(userPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    apigClient.userOptions = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var userOptionsRequest = {
            verb: 'options'.toUpperCase(),
            path: pathComponent + uritemplate('/user').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(userOptionsRequest, authType, additionalParams, config.apiKey);
    };
    
    apigClient.userSwitchGet = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var userSwitchGetRequest = {
            verb: 'get'.toUpperCase(),
            path: pathComponent + uritemplate('/user/switch').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(userSwitchGetRequest, authType, additionalParams, config.apiKey);
    };
    
    apigClient.userSwitchPost = function (params, body, additionalParams) {
        if(additionalParams === undefined) { additionalParams = {}; }
        
        apiGateway.core.utils.assertParametersDefined(params, [], ['body']);
        
        var userSwitchPostRequest = {
            verb: 'post'.toUpperCase(),
            path: pathComponent + uritemplate('/user/switch').expand(apiGateway.core.utils.parseParametersToObject(params, [])),
            headers: apiGateway.core.utils.parseParametersToObject(params, []),
            queryParams: apiGateway.core.utils.parseParametersToObject(params, []),
            body: body
        };
        
        
        return apiGatewayClient.makeRequest(userSwitchPostRequest, authType, additionalParams, config.apiKey);
    };
    
    
    return apigClient;
};
