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
    var idNum = this.generateId();
    var id = "DDO-ID-" + idNum.toString();

    // Generate random did, sk, and pk
    var did = "0x" + Math.random().toString(36).substr(2, 16);
    var sk = [...Array(64)]
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("");
    var pk =
      "0x" +
      [...Array(40)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("");

    const myArgs = {
      contractId: this.roundArguments.contractId,
      contractFunction: "Register",
      invokerIdentity: "User1",
      contractArguments: [id, did, sk, pk],
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
