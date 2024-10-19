
var util = require('ethereumjs-util');
var crypto = require('crypto');
var seedrandom = require('seedrandom');

//Javascript has OO programming I guess. Seems the easiest way to implement a tree

/**
 * A tree class for implementing the Johnson Song Redactable signature scheme.
 * Associated functions below
 * 
 */

class TreeNode {

    constructor(k, depthRemaining, position) {
        this.k = k;
        this.v = null;

        this.left = null;
        this.right = null;
        this.depthRemaining = depthRemaining;
        this.position = position;
    }

    TreeNode(k, v, hash) {
        this.hash = hash;
        this.k = k;
        this.v = v;

        this.left = null;
        this.right = null;
    }

    setPosition(position) {
        this.position = position;
    }

    //Add children both at once
    addChildren(left, right) {
        this.left = left;
        this.right = right;
    }



    addLeftChild(left) {
        this.left = left;
    }

    addRightChild(right) {
        this.right = right;
    }

    getPosition() {
        return this.position;
    }

    setHash(hash) {
        this.hash = hash;
    }

    getHash() {
        return this.hash;
    }

    getK() {
        return this.k;
    }

    setK(k) {
        this.k = k;
    }

    setV(v) {
        this.v = v;
    }

    getV() {
        return this.v;
    }

}

//TODO: Everything from here down should probably be refactored into a Tree class

//Top level function to create signature tree. Defines parameters before
//calling a rucursion to generate the tree
function createTree(credentialList, redactedValues = new Map()) {
    //Demo of how credential properties should be formatted. Instrinsic positioning is required
    //As once an attribute is redacted their should be a blank space in the credential tree
    //This should call a function to format a raw claim from the database



    var levels = getDepth(credentialList.length);
    //var levels = 2;
    var node = createTreeRecursion(levels, null, '', redactedValues, -1);

    generateHash(node, credentialList, redactedValues);
    return node;
}

/**
 * Generate the hash at the leaf node. Assumes leaf is non null
 * @param {} leaf 
 * @param {*} credentialList 
 */
function leafHash(leaf, credentialList) {

    var attribute = credentialList.shift();
    if (attribute.redacted) {
        return util.toBuffer(attribute.data);
    } else {
        var credential_hash = JSON.stringify(attribute.data) + leaf.getK();
        return util.sha256(credential_hash);
    }
    //var k = leaf.getK();

}

/**
 * 
 * @param {*} depthRemaining Depth remaining in tree until leaves. Base recursion occurs when this = 0
 * @param {*} node The current node in the tree. If null then the root of the tree is generated first
 * @param {*} position The position of the current node in the tree as a string i.e. node 10: traverse down right, down left from the root
 * @param {*} redactedValues A map of signature values that are used to re-generate the root hash to verify a signature
 * @param {*} k - Only used for the first recursion - if k-epsilon is required
 */
function createTreeRecursion(depthRemaining, node, position, redactedValues, k = -1) {

    //End the recursion if the final depth has been reached, overwrite K value if necessary
    if (depthRemaining <= 0) {
        var pos = redactedValues.get(position);
        if (pos != undefined && pos.type == 'k') {
            node.setK(pos.value);
        }
        return;
    }

    //Special Case for the root node - could be factored out
    if (node == null) {
        if (redactedValues.get('') == undefined) k = PRNG(k).substring(2, 6);
        else k = redactedValues.get('').value;
        var node = new TreeNode(k, depthRemaining, '');

        position = '';
        createTreeRecursion(depthRemaining, node, position, redactedValues, k);
        //printTree(node);
        return node;
    }

    /**
     * General Case - Recurse down left tree then right tree
     */

    /**
     * If we are reconstructing a tree from an existing signature, there may be a predefined K value at this node
     * In this case we place the predefined K value in this node and continue the algorithm
     */
    var pos = redactedValues.get(position);
    if (pos != undefined && pos.type == 'k') {
        node.setK(pos.value);
    }

    //Get the K-value and use length doubling PRNG to get k-values for children
    k = node.getK();
    k = PRNG(k);

    //First two bytes of the new k are always "0.". There are 8 more bytes, which we split in half to form the K values for the children
    left = new TreeNode(k.substring(2, 6), depthRemaining, position + '0');
    right = new TreeNode(k.substring(6, 10), depthRemaining, position + '1');
    node.addChildren(left, right);

    //Recurse down the left path, then right
    --depthRemaining;
    createTreeRecursion(depthRemaining, node.left, position + '0', redactedValues);
    createTreeRecursion(depthRemaining, node.right, position + '1', redactedValues);


}

/** TODO
 * Function to print tree in a clean format
 * @param {*} node Root node
 */
function printTree(node) {
    //if (node.left== null) 
    if (node.left != null) printTree(node.left);
    if (node.right != null) printTree(node.right);
}

/**
 * Function to generate the merkle tree given a GGM tree, list of credential attributes,
 * and a list of redacted value hashes
 * @param {} node Root node of the merkle/GGM Tree 
 * @param {*} credentialList   Formatted List of the attributes in a credential
 * @param {} redactedValues List of pre-existing hashes of redacted attributes
 */
function generateHash(node, credentialList, redactedValues) {


    //If there is a pre-existing hash at this location, just use that and unwind
    var position = node.getPosition();
    var pos = redactedValues.get(position);
    if (pos != undefined && pos.type == 'v') {
        node.setV(util.toBuffer(pos.value));
        credentialList.shift();
    }
    //If both children are null this is a leaf node
    else if (node.left == null && node.right == null) {
        node.setV(leafHash(node, credentialList));
        return;

    } else if (node.right == null) {
        //If the right node is null, but the left is not then this is a special case.
        //Just propogate the child's hash up the tree
        generateHash(node.left);
        node.setV(node.left.getV());
        return;

    } else {
        //General case: non leaf node
        generateHash(node.left, credentialList, redactedValues);
        generateHash(node.right, credentialList, redactedValues);
        node.setV(util.sha256(node.left.getV() + node.right.getV()));
    }
}

/**
 * Outputs a 10 char random number, beginning with 0.
 * @param {*} seed -1 for random seed
 */
function PRNG(seed) {
    if (seed == -1) {
        var prng = seedrandom();
        var k = prng.quick().toString(16);
        return k;
    } else {
        var prng = seedrandom(seed);
        var k = prng.quick().toString(16);
        return k;
    }

}
/**
 * Gets the depth of a tree given the length of credential attributes
 * @param {*} messageLength 
 */
function getDepth(messageLength) {

    //Theoretically this will be incorrect for a 1 bit message. No actual credential will be 1 bit long ever
    var levels = Math.log2(messageLength);

    return Math.ceil(levels);
}

function signTree(node, privateKey) {

    //Generate the signature
    credential_hash = node.getV();
    issuer_privateKey = util.toBuffer(issuer_privateKey);
    var sig = util.ecsign(credential_hash, issuer_privateKey);
}

/**
 * Get the positions where either a k-value or hash will be required in the signature
 * @param {*} integer 
 * @param {*} node 
 * @param {*} redactedList 
 */
function getRedactedPositions(redactedList) {
    var length = redactedList.length;
    var levels = getDepth(length);
    var positionList = new Map();
    for (var i = 0; i < length; i++) {
        positionList.set(redactedList[i].leafPosition, redactedList[i].redacted);
    }

    //If a node is in complete, it is a part of the signature
    var complete = new Map();

    //Nodes placed here potentially have common ancestors
    var inProgress = new Map();
    var sibling, temp;

    //For each level in the tree
    for (var i = levels; i >= 0; i--) {
        for (var [pos, redacted] of positionList) {
            sibling = getSibling(pos);
            var siblingRedact = positionList.get(sibling);

            //If the siblings do not match then we cannot propagate the k or v up the tree
            if (redacted == siblingRedact) {
                temp = pos.substring(0, pos.length - 1);
                inProgress.set(temp, redacted);
            } else {

                complete.set(pos, redacted);
            }
        }

        //If we have clearly identified all highest ancestors
        if (inProgress.length == 0) break;
        //Copy the in progress set and clear for the next round
        positionList = new Map(inProgress);
        inProgress.clear();

    }



    return complete;
}

/**
 * Take a map of positional values required for a signature. Update the map to include
 * the values at these positions
 * @param {*} node Root of a signature tree
 * @param {*} positions Map of positional values
 */
function getRedactedValues(node, positions) {

    //If this node is at a required position (pos = true/false if exists)
    var val;
    var pos = positions.get(node.getPosition());
    if (pos != undefined) {
        //This is the ancestor of a redaction i.e. true. :. we want the V (hash) value
        if (pos) {
            val = util.bufferToHex(node.getV());
            pos = {
                type: 'v',
                value: val,
            }

            positions.set(node.getPosition(), pos);
        } else {
            val = node.getK();
            pos = {
                type: 'k',
                value: val,
            }

            positions.set(node.getPosition(), pos);
        }

    }

    if (node.left != null) getRedactedValues(node.left, positions);
    if (node.right != null) getRedactedValues(node.right, positions);

}

/**
 * Returns the sibling for a given node
 * @param {} position Tree position of a node
 */
function getSibling(position) {
    var newString;
    //Not a true binary number, so flip the bit as a string
    if (position[position.length - 1] == '1') {
        newString = position.substring(0, position.length - 1) + "0";
    } else {
        newString = position.substring(0, position.length - 1) + "1";
    }
    return newString;
}


/**
 * Determines the location of an index in tree notation
 * @param {*} index Index in credential list
 * @param {*} credList list of credential attributes
 */
function getLeafPosition(index, credList) {
    var length = credList.length;
    length = getDepth(length);
    var str = index.toString(2);
    return str.padStart(length, "0");

}


module.exports = {
    createTree,
    getRedactedPositions,
    getRedactedValues,
    getLeafPosition,
}