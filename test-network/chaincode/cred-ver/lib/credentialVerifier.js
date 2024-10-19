/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import { Contract } from 'fabric-contract-api';

class CredentialVerifier extends Contract {
    async getCredential(ctx, _id) {
        var pcredentialList = await ctx.stub.getState('Credential');
        var credentialList = pcredentialList.toString();
        var jsonCredentialList = JSON.parse(credentialList);
        var _credentials = jsonCredentialList.Credentials;
        var credential = _credentials[_id];

        return {
            id: credential[_id].id,
            issuer: credential[_id].issuer,
            holder: credential[_id].holder,
            credentialHash: credential[_id].credentialHash,
            issuerSig: credential[_id].issuerSig
        };
    }

    async checkIssuer(ctx, issuer_publicKey) {
        var pissuerList = await ctx.stub.getState('Issuer');
        var issuerList = pissuerList.toString();
        var jsonIssuerList = JSON.parse(issuerList);
        var _issuers = jsonIssuerList.DDOs;

        for (var _issuer in _issuers) {
            if (_issuer.ID == issuer_publicKey) {
                return true;
            }
        }

        return false;

    }

    async verifyRedactableCredential(ctx, id, signature, rootHash, unredactableHash) {
        //signature = JSON.parse(signature);

        var credentialInfo = await this.getCredential(ctx, id);

        var holder = credentialInfo.holder;
        var hash = credentialInfo.hash;
        //console.log(hash);
        var issuer_signature = credentialInfo.issuerSig;

        //console.log(holder);
        //console.log(util.bufferToHex(hash));
        //console.log(issuer_signature);
        signature = JSON.stringify(signature);
        //console.log(signature);

        console.log(unredactableHash);
        if (unredactableHash != hash) {
            //res.send("FAILURE: LIST OF UNREDACTABLE CREDENTIALS MODIFIED");
            //console.log(unredactableHash);
            console.log(hash);
        }

        //obtain issuer public key and check this key in the issuer's DDO
        if (issuer_signature == signature) {

            signature = JSON.parse(signature);

            /*
            Blockchain cannot store signature as buffer. Buffers have been stored
            as hex strings as they convert back to buffers safely
            */
            signature.r = util.toBuffer(signature.r);
            signature.s = util.toBuffer(signature.s);


            //If either hash or signature have been tampered with, the public key will be incorrect
            var issuer_publicKey = util.ecrecover(rootHash, signature.v, signature.r, signature.s);
            issuer_publicKey = util.bufferToHex(issuer_publicKey);

            //        var a = util.toBuffer("0x4388a34179a031a311e5664dbeb5932551ac140682ed354e7dfa805a7c5e8ed3");
            //        keyA = util.privateToPublic(a);

            //Verify that the public key found belongs to an issuer
            console.log("Signature Matches Blockchain!");
            console.log(issuer_publicKey);
            verifyIssuerPublicKey(ctx, issuer_publicKey);
        } else {
            console.log("FAILURE to match signatures");
        }
    }

    async verifyIssuerPublicKey(ctx, issuer_publicKey, issuerRegistry) {
        
        var result = await checkIssuer(ctx, issuer_publicKey);
        if (result) {
            console.log("Issuer found in registry");
            console.log('SUCCESS');
        }
        else console.log("FAILURE");
    }

    async addService(_id, _attributesList, _verifierid) {
        var pServiceList = await ctx.stub.getState('Service');
        var ServiceList = pServiceList.toString();
        var jsonServiceList = JSON.parse(ServiceList);
        var _Services = jsonServiceList.Services;
        
        var ser = {
            ID: _id,
            VerifierID: _verifierid,
            Attributes: _attributesList
        }

        _Services[_id] = ser;
        const val = {
            ID: 'Service',
            Issuers: _Services
        };
        await ctx.stub.putState(val.ID, Buffer.from(stringify(sortKeysRecursive(val))));
    }
}

export default CredentialVerifier;