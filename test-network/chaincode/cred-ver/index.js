/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const credentialVerifier = require('./lib/credentialVerifier');

module.exports.CredentialVerifier = credentialVerifier;
module.exports.contracts = [credentialVerifier];