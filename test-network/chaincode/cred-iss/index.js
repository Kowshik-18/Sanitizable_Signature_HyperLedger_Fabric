/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const credentialIssuer = require('./lib/credentialIssuer');

module.exports.CredentialIssuer = credentialIssuer;
module.exports.contracts = [credentialIssuer];