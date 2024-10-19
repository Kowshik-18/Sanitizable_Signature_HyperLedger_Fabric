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

class CredentialUser extends Contract {
    async getAllServices (ctx) {
        var pserviceList = await ctx.stub.getState('Service');
        var serviceList = pserviceList.toString();
        var jsonServiceList = JSON.parse(serviceList);
        const outputList = JSON.stringify(jsonServiceList, null, 4);
        
        console.log(outputList);
    }

    async redact (ctx, _id, credentialList) {
        var pserviceList = await ctx.stub.getState('Service');
        var serviceList = pserviceList.toString();
        var jsonServiceList = JSON.parse(serviceList);
        var _service = jsonServiceList[_id];

        var req_attr = _service.Attributes;
        var listCopy = [...credentialList]
    }
}

export default CredentialUser;