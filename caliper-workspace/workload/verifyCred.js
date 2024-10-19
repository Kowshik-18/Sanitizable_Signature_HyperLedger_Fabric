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
    // Generate random IDs with two digits
    var credIdNum = this.generateId();
    var cred_id = "Cred-ID-" + credIdNum.toString();
    var newHolderIdNum = this.generateId();
    var new_holder_id = "DDO-ID-" + newHolderIdNum.toString();
    var issuerIdNum = this.generateId();
    var issuer_id = "Issuer-ID-" + issuerIdNum.toString();

    const myArgs = {
      contractId: this.roundArguments.contractId,
      contractFunction: "verifyCredential",
      invokerIdentity: "User1",
      contractArguments: [cred_id, new_holder_id, issuer_id],
      readOnly: true,
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
