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
    var cred_id = "Cred-ID-" + credIdNum.toString();
    var newHolderIdNum = this.generateId();
    var new_holder_id = "DDO-ID-" + newHolderIdNum.toString();
    var noncePrime = Math.floor(Date.now() + Math.random() * 10000).toString();

    var userNum = this.generateId();
    var user = "DDO-ID-" + userNum.toString();
    var rights = "read";
    var delegationChain = [{ user: user, rights: rights }];
    var mod = JSON.stringify({ delegationChain: delegationChain });

    const myArgs = {
      contractId: this.roundArguments.contractId,
      contractFunction: "delegateRights",
      invokerIdentity: "User1",
      contractArguments: [cred_id, mod, new_holder_id, noncePrime],
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
