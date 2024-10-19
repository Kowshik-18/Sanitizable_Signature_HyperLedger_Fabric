/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

// Deterministic JSON.stringify()
import { Contract } from "fabric-contract-api";
import stringify from "json-stringify-deterministic";
import sortKeysRecursive from "sort-keys-recursive";
var treeJS = require("./modules/treeNode.js");

class CredentialIssuer extends Contract {
  async InitLedger(ctx) {
    const assets = [
      {
        ID: "Registered",
        Accounts: [],
      },
      {
        ID: "Revoked",
        Accounts: [],
      },
      {
        ID: "DDO",
        DDOs: {},
      },
      {
        ID: "Token",
        Tokens: {},
      },
      {
        ID: "Service",
        Services: {},
      },
      {
        ID: "Issuer",
        Issuers: {},
      },
      {
        ID: "Verifier",
        Verifiers: {},
      },
    ];

    for (const asset of assets) {
      asset.docType = "asset";
      await ctx.stub.putState(
        asset.ID,
        Buffer.from(stringify(sortKeysRecursive(asset)))
      );
    }
  }

  async Register(ctx, _id, _did, _sender) {
    // Check if the account is already registered
    const pregisteredList = await ctx.stub.getState("Registered");
    const registeredList = pregisteredList.toString();
    const jsonRegisteredList = JSON.parse(registeredList);
    var registeredAccounts = jsonRegisteredList.Accounts;
    const registered = await registeredAccounts.includes(_id);
    if (registered) {
      throw new Error(`The account ${_id} already exists`);
    }

    // Check if the account has been revoked
    const prevokedList = await ctx.stub.getState("Revoked");
    const revokedList = prevokedList.toString();
    const jsonRevokedList = JSON.parse(revokedList);
    const revokedAccounts = jsonRevokedList.Accounts;
    const revoked = await revokedAccounts.includes(_id);
    if (revoked) {
      throw new Error(`The account ${_id} already exists`);
    }

    // If not, then put the data into the DID registry
    var DDO = {
      owner: "",
      newOwner: "",
      id: "",
      did: "",
      keyNo: 0,
      keys: {},
      endpointNo: 0,
      endpoints: {},
      delegated: false,
      total: 0,
      delegates: [],
      agreeing: false,
      agreeThreshold: 0,
      agreeState: {},
      updateThreshold: 0,
    };
    DDO.owner = _sender;
    DDO.id = _id;
    DDO.did = _did;

    // Add the DDO to the blockchain
    const pDDOList = await ctx.stub.getState("DDO");
    const DDOList = pDDOList.toString();
    const jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    _DDOs[_id] = DDO;
    const val = {
      ID: "DDO",
      DDOs: _DDOs,
    };
    await ctx.stub.putState(
      val.ID,
      Buffer.from(stringify(sortKeysRecursive(val)))
    );

    // Add to the blockchain that the account has been registered
    registeredAccounts.push(_id);
    const val2 = {
      ID: "Registered",
      Accounts: registeredAccounts,
    };
    await ctx.stub.putState(
      val2.ID,
      Buffer.from(stringify(sortKeysRecursive(val2)))
    );
  }

  async addPublicKey(ctx, _id, __controller, __keyValue) {
    var pDDOList = await ctx.stub.getState("DDO");
    var DDOList = pDDOList.toString();
    var jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    var DDO = _DDOs[_id];

    DDO.keyNo++;
    DDO.keys[DDO.keyNo] = {
      _id: DDO.keyNo,
      _controller: __controller,
      _keyValue: __keyValue,
    };

    _DDOs[_id] = DDO;

    const val = {
      ID: "DDO",
      DDOs: _DDOs,
    };
    await ctx.stub.putState(
      val.ID,
      Buffer.from(stringify(sortKeysRecursive(val)))
    );
  }

  async removePublicKey(_id, i) {
    var pDDOList = await ctx.stub.getState("DDO");
    var DDOList = pDDOList.toString();
    var jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    var DDO = _DDOs[_id];

    DDO.keyNo--;

    for (let k = i; k < DDO[_id].keyNo; k++) {
      DDO[_id].keys[k] = DDO[_id].keys[k + 1];
      DDO[_id].keys[k]._id--;
    }
    identity[_id].keyNo--;
    for (; i <= identity[_id].keyNo; i++) {
      identity[_id].keys[i] = identity[_id].keys[i + 1];
      identity[_id].keys[i]._id--;
    }
    delete identity[_id].keys[i];
  }

  async getPublicKey(ctx, _id, i) {
    var pDDOList = await ctx.stub.getState("DDO");
    var DDOList = pDDOList.toString();
    var jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    var DDO = _DDOs[_id];

    return {
      _id: DDO[_id].keys[i]._id,
      _controller: DDO[_id].keys[i]._controller,
      _keyValue: DDO[_id].keys[i]._keyValue,
    };
  }

  async addServiceEndpoint(ctx, _id, __type, __URL) {
    var pDDOList = await ctx.stub.getState("DDO");
    var DDOList = pDDOList.toString();
    var jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    var DDO = _DDOs[_id];

    DDO[_id].endpointNo++;
    DDO.keys[DDO.endpointNo] = {
      _id: DDO.endpointNo,
      _type: __type,
      _endpointURL: __URL,
    };

    _DDOs[_id] = DDO;

    const val = {
      ID: "DDO",
      DDOs: _DDOs,
    };
    await ctx.stub.putState(
      val.ID,
      Buffer.from(stringify(sortKeysRecursive(val)))
    );
  }

  async removeServiceEndpoint(ctx, _id, i) {
    var pDDOList = await ctx.stub.getState("DDO");
    var DDOList = pDDOList.toString();
    var jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    var DDO = _DDOs[_id];

    // DDO[_id].endpointNo--;
    // for(; i <= identity[_id].endpointNo; i++){
    //     identity[_id].endpoints[i] = identity[_id].endpoints[i+1];
    //     identity[_id].endpoints[i]._id--;
    // }
    // delete identity[_id].endpoints[i];
  }

  async getServiceEndpoint(ctx, _id, i) {
    var pDDOList = await ctx.stub.getState("DDO");
    var DDOList = pDDOList.toString();
    var jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    var DDO = _DDOs[_id];

    return {
      _id: DDO[_id].endpoints[i]._id,
      _type: DDO[_id].endpoints[i]._type,
      _endpointURL: DDO[_id].endpoints[i]._endpointURL,
    };
  }

  async getInfo(ctx, _id) {
    var pDDOList = await ctx.stub.getState("DDO");
    var DDOList = pDDOList.toString();
    var jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    var DDO = _DDOs[_id];

    return DDO[_id].did, DDO[_id].keyNo, DDO[_id].endpointNo;
  }

  async getDID(ctx, _id) {
    var pDDOList = await ctx.stub.getState("DDO");
    var DDOList = pDDOList.toString();
    var jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    var DDO = _DDOs[_id];

    return DDO[_id].did;
  }

  async revokeIdentity(ctx, _id) {
    var pDDOList = await ctx.stub.getState("DDO");
    var DDOList = pDDOList.toString();
    var jsonDDOList = JSON.parse(DDOList);
    var _DDOs = jsonDDOList.DDOs;
    var DDO = _DDOs[_id];

    // Check if the account is already registered
    const pregisteredList = await ctx.stub.getState("Registered");
    const registeredList = pregisteredList.toString();
    const jsonRegisteredList = JSON.parse(registeredList);
    var registeredAccounts = jsonRegisteredList.Accounts;

    // Check if the account has been revoked
    const prevokedList = await ctx.stub.getState("Revoked");
    const revokedList = prevokedList.toString();
    const jsonRevokedList = JSON.parse(revokedList);
    var revokedAccounts = jsonRevokedList.Accounts;

    revokedAccounts.push(_id);
    const val1 = {
      ID: "Revoked",
      Accounts: revokedAccounts,
    };
    await ctx.stub.putState(
      val1.ID,
      Buffer.from(stringify(sortKeysRecursive(val1)))
    );

    const index = registeredAccounts.indexOf(_id);
    registeredAccounts.splice(_id, 1);
    const val2 = {
      ID: "Registered",
      Accounts: registeredAccounts,
    };
    await ctx.stub.putState(
      val2.ID,
      Buffer.from(stringify(sortKeysRecursive(val2)))
    );

    delete DDO[_id];
  }

  async createCredential(ctx, credentialList, issuer_privateKey) {
    var listCopy = [...credentialList];

    var start = process.hrtime();
    var node = treeJS.createTree(listCopy);

    var positions = treeJS.getRedactedPositions(credentialList);
    var listCopy = [...credentialList];

    treeJS.getRedactedValues(node, positions);

    var unredactable = ["Attr1", "Attr3"];

    issuer_privateKey = util.toBuffer(issuer_privateKey);
    var sig = util.ecsign(node.getV(), issuer_privateKey);
    sig.s = util.bufferToHex(sig.s);
    sig.r = util.bufferToHex(sig.r);

    var now = new Date();
    //var now = date.getTime();
    var sha256 = crypto.createHash("sha256");
    var credentialID = sha256.update(issuer_privateKey + now);
    credentialID = sha256.digest("hex");

    var end = process.hrtime(start);

    var response = JSON.stringify({
      signature: {
        sig: sig,
        positions: [...positions],
      },
      credential: listCopy,
      id: credentialID,
      unredactable: unredactable,
    });
    var hash = util.bufferToHex(util.sha256(unredactable));
    //Send to blockchain
    credentialJS.issueCredential(
      ctx,
      credentialID,
      "0xbC46abEa70077F2e2ce1864BeA2235b5360a59d6",
      "0xbC46abEa70077F2e2ce1864BeA2235b5360a59d6",
      hash,
      JSON.stringify(sig),
      "20"
    );

    //console.log(response);
    fs.writeFile(
      "public/credentials/credential.json",
      response,
      function (err) {
        if (err) console.log(err);
      }
    );
  }

  async addCredential(
    ctx,
    _id,
    _issuer,
    _holder,
    _credentialHash,
    _signedHash,
    _validDate
  ) {
    var ptokenList = await ctx.stub.getState("Token");
    var tokenList = ptokenList.toString();
    var jsonTokenList = JSON.parse(tokenList);
    var _tokens = jsonTokenList.Tokens;

    var Token = {
      id: _id,
      issuer: _issuer,
      holder: _holder,
      credentialHash: _credentialHash,
      issuerSig: _signedHash,
      validDate: _validDate,
    };

    _tokens[_id] = Token;
    const val = {
      ID: "Token",
      DDOs: _tokens,
    };
    await ctx.stub.putState(
      val.ID,
      Buffer.from(stringify(sortKeysRecursive(val)))
    );
  }

  async addIssuer(ctx, _id, _did) {
    var iss = {
      ID: _id,
      DID: _did,
    };
    var pissuerList = await ctx.stub.getState("Issuer");
    var issuerList = pissuerList.toString();
    var jsonIssuerList = JSON.parse(issuerList);
    var _issuers = jsonIssuerList.Issuers;

    _issuers[_id] = iss;
    const val = {
      ID: "Issuer",
      Issuers: _issuers,
    };
    await ctx.stub.putState(
      val.ID,
      Buffer.from(stringify(sortKeysRecursive(val)))
    );
  }
}

export default CredentialIssuer;
