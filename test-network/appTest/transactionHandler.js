const FabricCAServices = require('fabric-ca-client');
const {Wallets, Gateway} = require('fabric-network');
const fs = require('fs');
const path = require('path');
const { mainModule } = require('process');
var functionsJS = require('./functions.js');

const commonfile = "./node_modules/fabric-ca-client/config/default.json"

console.log('a');

const data = JSON.parse(fs.readFileSync(commonfile, 'utf-8'));
data["request-timeout"] = 30000;
data["connection-timeout"] = 30000;
// console.log(data)
fs.writeFileSync(commonfile, JSON.stringify(data));

// ./network.sh deployCC -ccn fabhouse -ccp ./chaincode -ccl go
// ../organizations/peerOrganizations/org1.example.com/connection-org1.json
// ../organizations/peerOrganizations/org2.example.com/connection-org2.json
// ./input.txt

async function SCFunctionCaller(arg1, arg2) {

    const pemfile = "../organizations/peerOrganizations/org1.example.com/connection-org1.json";
    const ccpPath = path.resolve(pemfile);
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf-8'));

    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, {trustedRoots: caTLSCerts, verify: false}, caInfo.name);

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    var adminIdentity = await wallet.get('admin');
    // console.log(adminIdentity);
    const enrollment = await ca.enroll({enrollmentID: 'admin', enrollmentSecret: 'adminpw'});
    const x509Identity = {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
        },
        mspId: 'Org1MSP',
        type: 'X.509'
    };
    await wallet.put('admin', x509Identity);
    console.log('Successfully enrolled user "admin"');
    adminIdentity = await wallet.get('admin');

    var userIdentity = await wallet.get('appUser1');
    if(userIdentity) {
        console.log('An identity for the user "appUser1" already exists in the wallet');
    } else {
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser1',
            role: 'client'
        }, adminUser);

        const enrollment = await ca.enroll({
            enrollmentID: 'appUser1',
            enrollmentSecret: secret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('appUser1', x509Identity);
        console.log('Successfully registered user "appUser1"');
        userIdentity = await wallet.get('appUser1');
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {wallet, identity: 'appUser1', discovery: {enabld: true, asLocalhost: true}});

    const network = await gateway.getNetwork('channel1');
    const contract = network.getContract('basic');

    if (arg1 == "addDID") {
        inputs = JSON.parse(arg2);
        try {
            keystr = JSON.stringify(inputs.pk);
            endpointstr = JSON.stringify(inputs.endpoint);
            var x = await contract.submitTransaction(arg1, inputs.id, inputs.did, inputs.sender, keystr, endpointstr);
            console.log('1');
        } catch (error) {
            console.log(error);
        }
    } else if (arg1 == "createCredential") {
        inputs = JSON.parse(arg2);
        try {
            credstr = JSON.stringify(inputs.credential);
            var x = await contract.submitTransaction(arg1, credstr, inputs.id, inputs.prkey);
            var data = JSON.stringify(x);
            console.log("createCredential", new Date().getTime());
            functionsJS.sendPostRequest(data, 'POST', '127.0.0.1', '/create/claim', 8081);
        } catch (error) {
            console.log(error);
        }
    } else if (arg1 == "createClaim") {
        inputs = JSON.parse(arg2);
        try {
            credstr = JSON.stringify(inputs.credential);
            attrstr = JSON.stringify(inputs.attributes);
            var x = await contract.submitTransaction(arg1, credstr, attrstr);
            var x1 = {Claim: JSON.parse(x.toString())};
            var data1 = JSON.stringify(x1);
            fs.writeFileSync('./files/userClaim.json', data1);
            var data = JSON.stringify({
                filepath: './files/userClaim.json',
                filename: 'userClaim.json'
            });
            console.log("createClaim", new Date().getTime());
            functionsJS.sendPostRequest(data, 'POST', '127.0.0.1', '/upload/claim', 8081);
        } catch (error) {
            console.log(error);
        }
    } else if (arg1 == "verifyRedactableCredential") {
        inputs = JSON.parse(arg2);
        try {
            signstr = JSON.stringify(inputs.signature);
            claimstr = JSON.stringify(inputs.claim);
            var x = await contract.submitTransaction(arg1, inputs.id, signstr, claimstr, inputs.hash);
            var data = JSON.stringify({
                finalResponse: x.toString()
            });
            console.log("verifyCredential", new Date().getTime());
            functionsJS.sendPostRequest(data, 'POST', '127.0.0.1', '/get/final', 8081);
        } catch (error) {
            console.log(error);
        }
    } else {
        console.log("No such function");
    }
}

module.exports = {
    SCFunctionCaller,
}