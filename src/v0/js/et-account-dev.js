/* ----- Configuration Part --------------- */
// Configuration
var AWS_REGION = 'ap-northeast-1';
var USER_POOL_ID = 'ap-northeast-1_GFX1gEEMf';
var CLIENT_ID = '3rm0mjso3jdba8lhn3b8lf63as';
var IDENTITY_POOL_ID = 'ap-northeast-1:33e6b471-d449-4a95-8477-71ba69a08961';
var COGNITO_IDP = 'cognito-idp.' + AWS_REGION + '.amazonaws.com/' + USER_POOL_ID;
var CC_API_KEY = 'khSFmEHqQK2CGFL32DgvS7BquGNU6Q2b4WBZ4sAc'

AWS.config.region = AWS_REGION;
AWSCognito.config.region = AWS_REGION;

/* ----- Account Class --------------- */
class Account {

    // account = new Account()
    constructor() {
        this.userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool({
            UserPoolId: USER_POOL_ID,
            ClientId: CLIENT_ID
        });
        this.cognitoUser = this.userPool.getCurrentUser();
    }

    _attributeEmail(username) {
        var dataEmail = {
            Name: 'email',
            Value: username
        };
        return new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
    }

    signUp(username, password, attributeList) {
        return new Promise((resolve, reject) => {
            var attributeEmail = this._attributeEmail(username)
            attributeList.push(attributeEmail);
            this.userPool.signUp(username, password, attributeList, null, function(err, result) {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    _setUser(userName, password) {
        this.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser({
            Username: userName,
            Pool: this.userPool
        });
        return new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails({
            Username: userName,
            Password: password,
        });
    }

    signIn(userName, password) {
        return new Promise((resolve, reject) => {
            var authenticationDetails = this._setUser(userName, password);
            this.cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: result => {
                    resolve();
                },
                onFailure: err => {
                    reject(err);
                },
            });
        });
    }

    signOut() {
        if (this.cognitoUser !== null) this.cognitoUser.signOut();
    }

    activate(user, verifycode) {
        if (user !== null) this.cognitoUser = user;
        return new Promise((resolve, reject) => {
            this.cognitoUser.confirmRegistration(verifycode, true, function(err, result) {
                if (err) reject(err);
                else resolve(result);
            })
        })
    }

    forgotPassword(username, selector, hideselector) {
        var userData = {
            Username: username,
            Pool: this.userPool
        };
        this.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        return new Promise((resolve, reject) => {
            this.cognitoUser.forgotPassword({
                onSuccess: function(result) {
                    resolve(result);
                },
                onFailure: function(err) {
                    reject(err);
                },
                inputVerificationCode() {
                    $(selector).show();
                    $(hideselector).hide();
                }
            });
        });
    }

    confirmPassword(verificationCode, newPassword) {
        return new Promise((resolve, reject) => {
            this.cognitoUser.confirmPassword(verificationCode, newPassword, {
                onSuccess: result => {
                    resolve(result);
                },
                onFailure: err => {
                    reject(err);
                },
            });
        })
    }

    resendActivateCode(username) {
        var userData = {
            Username: username,
            Pool: this.userPool
        };
        this.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        return new Promise((resolve, reject) => {
            this.cognitoUser.resendConfirmationCode(function(err, result) {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    getToken() {
        return new Promise((resolve, reject) => {
            if (this.cognitoUser === null) {
                resolve(null);
                return;
            }
            this.cognitoUser.getSession((err, result) => {
                if (err) {
                    console.log('Not logged in.');
                    reject(null);
                } else {
                    var token = result.idToken.jwtToken;
                    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                        IdentityPoolId: IDENTITY_POOL_ID,
                        Logins: {
                            [COGNITO_IDP]: token
                        }
                    });
                    // Important!
                    // https://github.com/aws/amazon-cognito-identity-js/issues/79
                    // http://stackoverflow.com/questions/29524973/how-to-logout-from-amazon-cognito-javascript-and-clear-cached-identityid
                    AWS.config.credentials.clearCachedId();
                    AWS.config.credentials.refresh((error) => {
                        if (error) {
                          console.log(error);
                          window.location.href = cclogin_page;
                        }
                        else console.log('Successfully logged In!');
                    });
                    resolve(token);
                }
            });
        });
    }

    getAuthInfo() {
        return new Promise((resolve, reject) => {
            if (this.cognitoUser === null) {
                resolve(null);
                return;
            }
            this.cognitoUser.getSession((err, result) => {
                if (err) {
                    console.log('Not logged in.');
                    reject(null);
                } else {
                    var token = result.idToken.jwtToken;
                    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                        IdentityPoolId: IDENTITY_POOL_ID,
                        Logins: {
                            [COGNITO_IDP]: token
                        }
                    });
                    // Important!
                    // https://github.com/aws/amazon-cognito-identity-js/issues/79
                    // http://stackoverflow.com/questions/29524973/how-to-logout-from-amazon-cognito-javascript-and-clear-cached-identityid
                    AWS.config.credentials.clearCachedId();
                    AWS.config.credentials.refresh((error) => {
                        if (error) console.log(error);
                        else {
                            var accessKeyId = AWS.config.credentials.accessKeyId;
                            var secretAccessKey = AWS.config.credentials.secretAccessKey;
                            var sessionToken = AWS.config.credentials.sessionToken;
                            var apikey = CC_API_KEY;
                            var region = AWS_REGION;
                            resolve({
                                accessKeyId,
                                secretAccessKey,
                                sessionToken,
                                apikey,
                                region
                            });
                        }
                    });
                }
            });
        });
    }

    // Custom Function
    showMessage(text, classname, selector, hiddentime = 5000) {
        $(selector).text(text);
        $(selector).addClass(classname);
        $(selector).show();
        if (hiddentime > 0) {
            setTimeout(function() {
                $(selector).fadeOut();
                $(selector).removeClass(classname);
            }, hiddentime);
        }
    }

    errorCheck(text1, text2) {
        if (text1 != text2) return false
        else return true
    }
}
