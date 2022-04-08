// CloudContract Pages:
// - common
var cctop_page = "../main.html";
var cclogin_page = "./pages/login.html";
var ccregister_page = "./pages/register.html";

var CC_PDFSCALE = 1.3;

$(window).load(function() {
    var zopim =
        '<script>(function(){\n' +
        'var w=window,d=document;\n' +
        'var s="https://app.chatplus.jp/cp.js";\n' +
        'd["__cp_d"]="https://app.chatplus.jp";\n' +
        'd["__cp_c"]="0743ea61_1";\n' +
        'var a=d.createElement("script"), m=d.getElementsByTagName("script")[0];\n' +
        'a.async=true,a.src=s,m.parentNode.insertBefore(a,m);})();</script>';
    
    var mypath = location.pathname.split('/'); 
    if ((mypath[mypath.length - 1]) === 'pdfview.html') {
        /* pdfview.html では非表示とする */
        return;
    }
    $('head').append(zopim);
});

signOut = () => {
    account.signOut();
    postSwitchUser("")
    window.location.href = cclogin_page;
}

getGetParams = () => {
    var arg = new Object;
    var url = location.search.substring(1).split('&');
    for (i = 0; url[i]; i++) {
        var k = url[i].split('=');
        arg[k[0]] = k[1];
    }
    return arg
}

getDocumentCount = () => {
    var types = {
        receiver: "#cc-receiver-count",
        send: "#cc-send-count",
        review: "#cc-review-count",
        prepare: "#cc-prepare-count"
    };
    Object.keys(types).forEach(function(key) {
        apigClient.documentCountGet(params = {
            type: key
        }, {}).then(function(result) {
            $(types[key]).text(result.data.body);
        }).catch(function(result) {
            erralert(result);
        });
    });
}

getSwitchUser = () => {
    apigClient.userSwitchGet(params = {}, {}).then(function(result) {
        item = JSON.parse(result.data.body).Items[0]
        $('#user_menu').append('<li><a href="#"  style="font-size: 1.1em; padding: 10px;" onclick="postSwitchUser(\''+item.id+'\');">' + item.email + '</a></li>');
        if (item.children) {
            item.children.forEach(function(v, i) {
                $('#user_menu').append('<li><a href="#" style="font-size: 1.1em; padding: 10px;" onclick="postSwitchUser(\''+v.id+'\');">' + v.email + '</a></li>');
                if (item.currentId === v.id) {
                    $("#cc-step3-sender").text(v.email);
                    $(".cc-uname").text(v.email);
                    if (this.upload) {
                        this.upload.sender = v.email
                    }
                }
            });
        }
        $('#user_menu').append('<li role="separator" class="divider"></li>');
        $('#user_menu').append('<li><a href="#" style="font-size: 1.1em; padding: 10px;" onclick="signOut();">ログアウト</a></li>');
    }).catch(function(result) {
        erralert(result);
    });
}

getCurrentUserEmail = () => {
    return new Promise((resolve, reject) => {
        apigClient.userSwitchGet(params = {}, {}).then(function(result) {
            item = JSON.parse(result.data.body).Items[0]
            var CurrentUserEmail;
            if (item.children) {
                item.children.forEach(function(v, i) {
                    if (item.currentId === v.id) {
                        CurrentUserEmail = v.email;
                        // resolve(v.email);
                    }
                });
            }
            resolve(CurrentUserEmail);
        }).catch(function(result) {
            erralert(result);
        });
    });
}

postSwitchUser = (switchUserId) => {
    apigClient.userSwitchPost(params = {}, {switchUserId: switchUserId}).then(function(result) {
        location.reload();
    }).catch(function(result) {
        erralert(result);
    });
}

erralert = (message) => {
    alert("システムが混雑しています。\nお手数ですが、しばらくしてから再度作業を実施してください。\n");
}

timestampConvertorYYMMDD = (timestamp) => {
    if (!timestamp) {
        return "-"
    }
    var year = timestamp.substr(0, 4);
    var month = timestamp.substr(4, 2);
    var day = timestamp.substr(6, 2);
    return year + "-" + month + "-" + day;
}

timestampConvertor = (timestamp) => {
    var year = timestamp.substr(0, 4);
    var month = timestamp.substr(4, 2);
    var day = timestamp.substr(6, 2);
    var hour = timestamp.substr(8, 2);
    var minute = timestamp.substr(10, 2);
    var second = timestamp.substr(12, 2);
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
}

timestampToString = (date) => {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    if (month < 10) month = '0' + month;
    if (day < 10) day = '0' + day;
    if (hour < 10) hour = '0' + hour;
    if (min < 10) min = '0' + min;
    if (sec < 10) sec = '0' + sec;
    return String(year) + String(month) + String(day) + String(hour) + String(min) + String(sec);
}

mailcheck = (val) => {
    if (!val.match(/^([a-zA-Z0-9])+([a-zA-Z0-9\._+-])*@([a-zA-Z0-9_-])+([a-zA-Z0-9\._-]+)+$/) && val !== "") return false;
    else return true;
}

invalidcheck = (data, email) => {
    var check = true;
    if (typeof data.receiver === typeof []) {
        data.receiver.forEach(function(val) {
            // 複数契約の場合、自分のアイテムもしくは自分が受信者に含まれていれば表示可能。
            if (data.isme || val === email) check = false;
        });
    } else {
        // 二者間契約の場合のチェック、自分のアイテムもしくは受信者であれば表示可能
        if (data.isme || email === data.receiver) check = false;
    }
    // 社内稟議対応
    if (data.reviewer) {
        data.reviewer.forEach(function(val) {
            if (data.isme || val === email) check = false;
        });
    }
    return check;
}

// 可逆暗号化
// https://code.google.com/archive/p/crypto-js/
myCrypto = (text) => {
    return new Promise((resolve, reject) => {
        apigClientFactory.newClient().appkeyGet(params = {}, {}).then(function(result) {
            var key = JSON.parse(result.data.body).Items[0].key;
            var utf8_plain = CryptoJS.enc.Utf8.parse(text);
            var enctext = CryptoJS.AES.encrypt(utf8_plain, key);
            resolve(enctext.toString());
        }).catch(function(result) {
            reject(result);
        });
    });
}

// エスケープ処理
myEscape = (text) => {
    return jQuery('<span/>').text(text).html();
}
