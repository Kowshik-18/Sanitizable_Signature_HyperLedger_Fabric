"use strict";

const stringify = require("json-stringify-deterministic");
const sortKeysRecursive = require("sort-keys-recursive");
const { Contract } = require("fabric-contract-api");
const { sign, sanit } = require("./sanitizableUtils.js");

class CredOverall extends Contract {
  async InitLedger(ctx) {
    const assets = [
      {
        ID: "DDO-ID-0",
        owner: "0xbC46abEa70077F2e2ce1864BeA2236b5360a59d7",
        did: "0xbC46abEa70077F2e2ce1864BeA2236b5360a59d7",
        Private_Key: "generatedPrivateKey",
        Public_Key: "generatedPublicKey",
      },
      {
        ID: "Issuer-ID-0",
        Private_Key: "generatedPrivateKey",
        Public_Key: "generatedPublicKey",
        Prefix_key: "generatedPrefixKey",
        DID: "0xbC46abEa70077F2e2ce1864BeA2236b5360a59d8",
        Signatures: [],
      },
      {
        ID: "Cred-ID-0",
        issuer_id: "0xb265c61c8cc8b176a1b261967fbb453a6f21e44f",
        holder_id: "0x69a362b338a6a3f03c1898579d33a56c0e87e9e9",
        credential_obj: {
          resource: "resourceExample",
          rights: "rightsExample",
          delegationChain: [],
        },
        credential_obj_hash: "generatedHash",
        sigma: "generatedSigma",
        sigma0: "generatedSigma0",
      },
    ];

    for (const asset of assets) {
      asset.docType = "asset";
      await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
    }
  }

  async Register(ctx, _id, _did, sk, pk) {
    console.time("addDID");
    const assetJSON = await ctx.stub.getState(_id); // get the asset from chaincode state
    if (!assetJSON || assetJSON.length === 0) {
      // const { sk, pk } = KGensan();
      var DDO = {
        ID: _id,
        Private_Key: sk,
        Public_Key: pk,
        did: _did,
      };

      await ctx.stub.putState(
        DDO.ID,
        Buffer.from(stringify(sortKeysRecursive(DDO)))
      );
    } else {
      throw new Error("DID with given ID already exists");
    }
    console.timeEnd("addDID");
  }

  async addIssuer(ctx, _id, _did, sksig, pksig, prfKey) {
    // const { sksig, pksig, prfKey } = KGensig();
    var iss = {
      ID: _id,
      Private_Key: sksig,
      Public_Key: pksig,
      Prefix_key: prfKey,
      did: _did,
      Signatures: [],
    };

    await ctx.stub.putState(
      iss.ID,
      Buffer.from(stringify(sortKeysRecursive(iss)))
    );
  }

  async createCredential(
    ctx,
    _id,
    issuer_id,
    holder_id,
    credentialString,
    nonce
  ) {
    console.time("createCred");

    // Fetch the asset to ensure it doesn't already exist
    const assetJSON = await ctx.stub.getState(_id);
    if (!assetJSON || assetJSON.length === 0) {
      // Fetch issuer's information from the state
      const issuerAssetJSON = await ctx.stub.getState(issuer_id);
      if (!issuerAssetJSON || issuerAssetJSON.length === 0) {
        throw new Error(`Issuer with ID ${issuer_id} does not exist`);
      }

      const issuerAsset = JSON.parse(issuerAssetJSON.toString());

      // Get the issuer's private key and prefix key
      const issuerPrivateKey = issuerAsset.Private_Key;
      const issuerPrefixKey = issuerAsset.Prefix_key;

      const holderAssetJSON = await ctx.stub.getState(holder_id);
      if (!holderAssetJSON || holderAssetJSON.length === 0) {
        throw new Error(`Holder with ID ${holder_id} does not exist`);
      }

      const holderAsset = JSON.parse(holderAssetJSON.toString());
      const holderPublicKey = holderAsset.Public_Key;

      const credentialJSON = JSON.parse(credentialString);
      console.log(credentialJSON);
      const credentialObj = {
        resource: credentialJSON.resource,
        rights: credentialJSON.rights,
        delegationChain: [],
      };
      const adm = ["delegationChain"];

      // Create a signature for the credential
      const { h, sigma, sigma0 } = sign(
        JSON.stringify(credentialObj),
        issuerPrivateKey,
        holderPublicKey,
        adm,
        issuerPrefixKey,
        nonce
      );

      // Create the credential token
      const Token = {
        ID: _id,
        issuer_id: issuer_id,
        holder_id: holder_id,
        credential_obj: credentialObj,
        credential_obj_hash: h,
        sigma: sigma,
        sigma0: sigma0,
      };

      // Update the issuer's signatures
      issuerAsset.Signatures.push({ C_id: _id, sig: sigma0 });
      await ctx.stub.putState(
        issuer_id,
        Buffer.from(JSON.stringify(issuerAsset))
      );

      console.log(issuerAsset);

      // Store the credential on the ledger
      await ctx.stub.putState(Token.ID, Buffer.from(JSON.stringify(Token)));
    } else {
      throw new Error("Credential with given ID already exists");
    }

    console.timeEnd("createCred");
  }

  async delegateRights(ctx, credential_id, mod, new_holder_id, NoncePrime) {
    console.time("delegateRights");
    console.log(credential_id);
    console.log(mod);
    console.log(NoncePrime);
    console.log(new_holder_id);

    // Parse the mod parameter
    try {
      mod = JSON.parse(mod);
    } catch (error) {
      throw new Error(`Invalid mod input: ${error.message}`);
    }

    // Ensure the mod object contains a delegationChain array
    if (!mod.delegationChain || !Array.isArray(mod.delegationChain)) {
      throw new Error(
        "Invalid mod input: delegationChain is missing or not an array"
      );
    }

    const holderAssetJSON = await ctx.stub.getState(new_holder_id);
    if (!holderAssetJSON || holderAssetJSON.length === 0) {
      throw new Error(`Holder with ID ${new_holder_id} does not registered`);
    } else {
      const originalAssetJSON = await ctx.stub.getState(credential_id);
      if (!originalAssetJSON || originalAssetJSON.length === 0) {
        throw new Error(`Credential with ID ${credential_id} does not exist`);
      }

      const originalCredential = JSON.parse(originalAssetJSON.toString());

      const issuer_id = originalCredential.issuer_id;
      const holder_id = originalCredential.holder_id;

      const issuerAssetJSON = await ctx.stub.getState(issuer_id);
      if (!issuerAssetJSON || issuerAssetJSON.length === 0) {
        throw new Error(`Issuer with ID ${issuer_id} does not exist`);
      }

      const issuerAsset = JSON.parse(issuerAssetJSON.toString());
      const issuerPublicKey = issuerAsset.Public_Key;

      const holderAssetJSON = await ctx.stub.getState(holder_id);
      if (!holderAssetJSON || holderAssetJSON.length === 0) {
        throw new Error(`Holder with ID ${holder_id} does not exist`);
      }

      const holderAsset = JSON.parse(holderAssetJSON.toString());
      const holderPrivateKey = holderAsset.Private_Key;
      const holderPublicKey = holderAsset.Public_Key;

      // Modify the credential object
      const modifiedObj = {
        resource: originalCredential.credential_obj.resource,
        rights: originalCredential.credential_obj.rights,
        delegationChain: [
          ...originalCredential.credential_obj.delegationChain,
          ...mod.delegationChain,
        ],
      };

      // Sanitize the original credential with the delegation details
      const { hPrime, sigmaPrime } = sanit(
        originalCredential.credential_obj,
        mod,
        originalCredential.sigma,
        issuerPublicKey,
        holderPublicKey,
        holderPrivateKey,
        NoncePrime
      );

      // Update the credential with new delegation
      originalCredential.credential_obj = modifiedObj;
      originalCredential.credential_obj_hash = hPrime;
      originalCredential.sigma = sigmaPrime;

      await ctx.stub.putState(
        credential_id,
        Buffer.from(JSON.stringify(originalCredential))
      );
    }
    console.timeEnd("delegateRights");
  }

  async verifyCredential(ctx, credential_id, new_holder_id, issuer_id) {
    const credentialJSON = await ctx.stub.getState(credential_id);
    if (!credentialJSON || credentialJSON.length === 0) {
      throw new Error(`Credential with ID ${credential_id} does not exist`);
    }

    const credential = JSON.parse(credentialJSON.toString());

    // Verify the issuer ID
    if (credential.issuer_id !== issuer_id) {
      return false;
    }

    // Fetch issuer's information from the state
    const issuerAssetJSON = await ctx.stub.getState(issuer_id);
    if (!issuerAssetJSON || issuerAssetJSON.length === 0) {
      throw new Error(`Issuer with ID ${issuer_id} does not exist`);
    }

    const issuerAsset = JSON.parse(issuerAssetJSON.toString());

    // Check if the signature matches
    const issuerSignature = issuerAsset.Signatures.find(
      (sig) => sig.C_id === credential_id
    );

    if (!issuerSignature || issuerSignature.sig !== credential.sigma0) {
      return false;
    }

    // Verify the delegation chain
    for (const delegation of credential.credential_obj.delegationChain) {
      if (delegation.user !== new_holder_id) {
        return false;
      }
    }

    return true;
  }
}

module.exports = CredOverall;
