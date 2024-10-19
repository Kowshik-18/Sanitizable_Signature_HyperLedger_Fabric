/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const credentialUser = require('./lib/credentialUser');

module.exports.CredentialUser = credentialUser;
module.exports.contracts = [credentialUser];