"use strict";

const { WorkloadModuleBase } = require("@hyperledger/caliper-core");

class MyWorkload extends WorkloadModuleBase {
  constructor() {
    super();
    this.generatedIds = new Set();
  }

  async initializeWorkloadModule(
    workerIndex,
    totalWorkers,
    roundIndex,
    roundArguments,
    sutAdapter,
    sutContext
  ) {
    await super.initializeWorkloadModule(
      workerIndex,
      totalWorkers,
      roundIndex,
      roundArguments,
      sutAdapter,
      sutContext
    );
  }

  generateId() {
    let idNum;
    if (this.generatedIds.size < 480) {
      do {
        idNum = Math.floor(Math.random() * 500) + 1;
      } while (this.generatedIds.has(idNum) && this.generatedIds.size < 480);
    } else {
      idNum = Math.floor(Math.random() * 500) + 1;
    }
    this.generatedIds.add(idNum);
    return idNum;
  }

  async submitTransaction() {
    var credIdNum = this.generateId();
    var id = "Cred-ID-" + credIdNum.toString();
    var issuerIdNum = this.generateId();
    var issuer_id = "Issuer-ID-" + issuerIdNum.toString();
    var holderIdNum = this.generateId();
    var holder_id = "DDO-ID-" + holderIdNum.toString();

    // Generate random credential string
    var resource = "Resource-" + this.generateId();
    var rights = "Access Rights-" + this.generateId();
    var credentialString = JSON.stringify({
      resource: resource,
      rights: rights,
    });

    // Generate random nonce
    var nonce = Math.floor(Date.now() + Math.random() * 10000).toString();

    const myArgs = {
      contractId: this.roundArguments.contractId,
      contractFunction: "createCredential",
      invokerIdentity: "User1",
      contractArguments: [id, issuer_id, holder_id, credentialString, nonce],
      readOnly: false,
    };

    await this.sutAdapter.sendRequests(myArgs);
  }

  async cleanupWorkloadModule() {
    // Cleanup if needed
  }
}

function createWorkloadModule() {
  return new MyWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
