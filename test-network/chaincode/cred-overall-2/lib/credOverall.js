/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
var util = require('ethereumjs-util');
var crypto = require('crypto');
var seedrandom = require('seedrandom');
var treeJS = require('./treeNode.js');

class CredOverall extends Contract {

    async InitLedger(ctx) {
        const assets = [
            {
                ID: 'DDO-ID-0',
                owner: '0xbC46abEa70077F2e2ce1864BeA2236b5360a59d7',
                newOwner: '',
                did: '0xbC46abEa70077F2e2ce1864BeA2236b5360a59d7',
                keyNo: 1,
                keys: { 1: {
                    _id: 1, 
                    _controller: '0xbC46abEa70077F2e2ce1864BeA2236b5360a59d7', 
                    _keyValue: '0xbC56abEa70077F2e2ce1864BeA2236b5360a59d7'
                }},
                endpointNo: 1,
                endpoints: { 1: {
                    _id: 1,
                    _type: "public",
                    _endpointURL: "http://did:123"
                }},
                delegated: false,
                total: 0,
                delegates: [],
                agreeing: false,
                agreeThreshold: 0,
                agreeState: {},
                updateThreshold: 0
            },
            {
                ID: 'Issuer-ID-0',
                DID: '0xbC46abEa70077F2e2ce1864BeA2236b5360a59d8'
            },
            {
                ID: 'Verifier-ID-0',
                DID: '0xbC46abEa70077F2e2ce1864BeA2236b5360a59e8'
            },
            {
                ID: 'Revoked',
                DID: []
            }
        ];

        for (const asset of assets) {
            asset.docType = 'asset';
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    async Register(ctx, _id, _did, _sender, _key, _endpoint) {

        const assetJSON = await ctx.stub.getState(_id);
        if (assetJSON) {
            return assetJSON && assetJSON.length > 0;
        }

        // Check if the account has been revoked
        const prevokedList = await ctx.stub.getState('Revoked');
        const revokedList = prevokedList.toString();
        const jsonRevokedList = JSON.parse(revokedList);
        const revokedAccounts = jsonRevokedList.Accounts;
        const revoked = await revokedAccounts.includes(_id);
        if (revoked) {
            throw new Error(`The account ${_id} already exists`);
        }

        // If not, then put the data into the DID registry
        var DDO = {
            ID: _id,
            owner: _sender,
            newOwner: '',
            did: _did,
            keyNo: 1,
            keys: {1: _key},
            endpointNo: 1,
            endpoints: {1: _endpoint},
            delegated: false,
            total: 0,
            delegates: [],
            agreeing: false,
            agreeThreshold: 0,
            agreeState: {},
            updateThreshold: 0
        };

        await ctx.stub.putState(DDO.ID, Buffer.from(stringify(sortKeysRecursive(DDO))));
    }
    async addIssuer(ctx, _id, _did) {
        var iss = {
            ID: _id,
            DID: _did
        };
        
        await ctx.stub.putState(iss.ID, Buffer.from(stringify(sortKeysRecursive(iss))));
    }

    async createCredential(ctx, credential, id, issuer_privateKey) {
        // var credentialList = JSON.parse(credentialString);
        var credentialList = credential.Credential;
        console.log(credentialList);
        var listCopy = [...credentialList];
        console.log('a');

        var node = treeJS.createTree(listCopy);
        console.log('a');

        var positions = treeJS.getRedactedPositions(credentialList);
        var listCopy = [...credentialList];
        console.log('a');

        treeJS.getRedactedValues(node, positions);
        console.log('a');

        var unredactable = ['Attr1', 'Attr3'];

        issuer_privateKey = util.toBuffer(issuer_privateKey);
        var sig = util.ecsign(node.getV(), issuer_privateKey);
        sig.s = util.bufferToHex(sig.s);
        sig.r = util.bufferToHex(sig.r);
        console.log('a');

        var credentialID = id;

        var hash = util.bufferToHex(util.sha256(Buffer.from(unredactable, 'utf8')));

        console.log(JSON.stringify(sig));
        //Send to blockchain
        await this.addCredential(ctx, credentialID,
            '0xb265c61c8cc8b176a1b261967fbb453a6f21e44f', '0x69a362b338a6a3f03c1898579d33a56c0e87e9e9', hash,
            JSON.stringify(sig), '20');
        
    }

    async addCredential(ctx, _id, _issuer, _holder, _credentialHash, _signedHash, _validDate) {

        var Token = {
            ID: _id,
            issuer: _issuer,
            holder: _holder,
            credentialHash: _credentialHash,
            issuerSig: _signedHash,
            validDate: _validDate
        };
        
        await ctx.stub.putState(Token.ID, Buffer.from(stringify(sortKeysRecursive(Token))));
    }
}

module.exports = CredOverall;
