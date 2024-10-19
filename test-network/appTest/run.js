var transactionJS = require('./transactionHandler.js');

arg2 = {
    'credential': {"Credential": [{"redacted":false,"redactable":false,"data":{"Attr0":"99"},"leafPosition":"00"},{"redacted":false,"redactable":false,"data":{"Attr1":"99"},"leafPosition":"01"},{"redacted":false,"redactable":true,"data":{"Attr2":"99"},"leafPosition":"10"},{"redacted":false,"redactable":true,"data":{"Attr3":"128"},"leafPosition":"11"}]},
    'id': 'Cred-ID-100000000001',
    'prkey': "0x6ee66421e9877edc05e1a85c3ec5e33f5428ba122ec17017b63d184733d464c0"
};

arg1 = 'createCredential';

transactionJS.SCFunctionCaller(arg1, JSON.stringify(arg2));