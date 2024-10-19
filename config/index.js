const crypto = require("crypto");
const ethUtil = require("ethereumjs-util");

// Pseudo-Random Function (PRF)
function PRF(key, nonce) {
  const hmac = crypto.createHmac("sha256", Buffer.from(key, "hex"));
  hmac.update(Buffer.from(nonce, "hex"));
  return hmac.digest("hex");
}

// Pseudo-Random Generator (PRG)
function PRG(seed) {
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(seed, "hex"));
  return hash.digest("hex");
}

// Cryptographic Hash Function (CHash)
function CHash(pk, Tag, data, r) {
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(pk, "hex"));
  hash.update(Buffer.from(Tag, "hex"));
  for (const [key, value] of Object.entries(data).sort()) {
    hash.update(Buffer.from(key.toString(), "utf8"));
    hash.update(Buffer.from(value.toString(), "utf8"));
  }
  hash.update(Buffer.from(r, "hex"));
  return hash.digest("hex");
}

// Chameleon Hash Adaptation (CHAdapt)
function CHAdapt(sk, Tag, data, r, TagPrime, dataPrime) {
  const skBuffer = Buffer.from(sk, "hex");

  const originalHash = crypto
    .createHmac("sha256", skBuffer)
    .update(Buffer.from(Tag, "hex"))
    .update(JSON.stringify(data))
    .update(Buffer.from(r, "hex"))
    .digest("hex");

  const newHash = crypto
    .createHmac("sha256", skBuffer)
    .update(Buffer.from(TagPrime, "hex"))
    .update(JSON.stringify(dataPrime))
    .digest("hex");

  const rPrimeBuffer = Buffer.from(r, "hex");
  const originalHashBuffer = Buffer.from(originalHash, "hex");
  const newHashBuffer = Buffer.from(newHash, "hex");

  for (let i = 0; i < rPrimeBuffer.length; i++) {
    rPrimeBuffer[i] ^= originalHashBuffer[i] ^ newHashBuffer[i];
  }

  const rPrime = rPrimeBuffer.toString("hex");
  return rPrime;
}

// Signing function (SSign) using ethereumjs-util.ecsign
function SSign(sksig, data) {
  const msgHash = ethUtil.keccak256(Buffer.from(JSON.stringify(data)));
  const { r, s, v } = ethUtil.ecsign(msgHash, Buffer.from(sksig, "hex"));
  return ethUtil.toRpcSig(v, r, s);
}

// Verifying function (SVF) using ethereumjs-util.ecverify
function SVF(pksig, data, signature) {
  const msgHash = ethUtil.keccak256(Buffer.from(JSON.stringify(data)));
  const { v, r, s } = ethUtil.fromRpcSig(signature);
  const pubKey = ethUtil.ecrecover(msgHash, v, r, s);
  return ethUtil.bufferToHex(ethUtil.pubToAddress(pubKey)) === pksig;
}

// Key Generation for signature scheme
function KGensig() {
  const privateKey = crypto.randomBytes(32);
  const publicKey = ethUtil.privateToPublic(privateKey).toString("hex");
  const sksig = privateKey.toString("hex");
  const pksig = ethUtil.bufferToHex(
    ethUtil.pubToAddress(Buffer.from(publicKey, "hex"))
  );
  const prfKey = crypto.randomBytes(32).toString("hex");
  return { sksig, pksig, prfKey };
}

// Key Generation for chameleon hash
function KGensan() {
  const privateKey = crypto.randomBytes(32);
  const publicKey = ethUtil.privateToPublic(privateKey).toString("hex");
  const sksan = privateKey.toString("hex");
  const pksan = ethUtil.bufferToHex(
    ethUtil.pubToAddress(Buffer.from(publicKey, "hex"))
  );

  return { sksan, pksan };
}

// Signing a message with chameleon hash and signature
function Sign(obj, sksig, pksan, adm, prfKey) {
  const Nonce = crypto.randomBytes(16).toString("hex");
  const x = PRF(prfKey, Nonce);
  const Tag = PRG(x);

  const r = adm.map(() => crypto.randomBytes(16).toString("hex"));
  const h = Object.keys(obj).map((key) =>
    adm.includes(key)
      ? CHash(pksan, Tag, { key, value: obj[key] }, r[adm.indexOf(key)])
      : obj[key]
  );

  const sigma0 = SSign(sksig, { h, pksan, adm });
  const sigma = { sigma0, Tag, Nonce, adm, r };

  console.log("Sign - h:", h);

  return { sigma, signature: sigma0 }; // Return both sigma and signature
}

// Sanitizing a message with modified values
function Sanit(obj, mod, sigma, pksig, sksan) {
  const { sigma0, Tag, Nonce, adm, r } = sigma;

  const h = Object.keys(obj).map((key) =>
    adm.includes(key)
      ? CHash(pksan, Tag, { key, value: obj[key] }, r[adm.indexOf(key)])
      : obj[key]
  );
  console.log("Sanit (before) - h:", h);
  console.log(SVF(pksig, { h, pksan, adm }, sigma0));

  if (!SVF(pksig, { h, pksan, adm }, sigma0)) {
    console.log("Initial signature verification failed");
    return null;
  }

  const objPrime = { ...obj };
  for (const key of adm) {
    if (mod.hasOwnProperty(key)) {
      objPrime[key] = mod[key];
    }
  }
  const NoncePrime = crypto.randomBytes(16).toString("hex");
  const TagPrime = PRG(PRF(sksan, NoncePrime));

  // Modified logic for calculating rPrime
  const rPrime = adm.map((key) => {
    const originalHash = CHash(
      pksan,
      Tag,
      { key, value: obj[key] },
      r[adm.indexOf(key)]
    );
    const newHashPrime = CHAdapt(
      sksan,
      Tag,
      { key, value: objPrime[key] },
      r[adm.indexOf(key)],
      TagPrime,
      { key, value: objPrime[key] }
    );
    const rPrimeBuffer = Buffer.from(r[adm.indexOf(key)], "hex");
    const originalHashBuffer = Buffer.from(originalHash, "hex");
    const newHashPrimeBuffer = Buffer.from(newHashPrime, "hex");
    for (let i = 0; i < rPrimeBuffer.length; i++) {
      rPrimeBuffer[i] ^= originalHashBuffer[i] ^ newHashPrimeBuffer[i];
    }
    return rPrimeBuffer.toString("hex");
  });

  const sigmaPrime = {
    sigma0,
    Tag: TagPrime,
    Nonce: NoncePrime,
    adm,
    r: rPrime,
  };

  const hPrime = Object.keys(objPrime).map((key) =>
    adm.includes(key)
      ? CHash(
          pksan,
          TagPrime,
          { key, value: objPrime[key] },
          rPrime[adm.indexOf(key)]
        )
      : objPrime[key]
  );
  console.log("Sanit (after) - hPrime:", hPrime);

  return { objPrime, sigmaPrime, signature: sigma0 }; // Return both objPrime, sigmaPrime, and the signature
}

// Verification Function
function Verify(obj, sigma, pksig, pksan) {
  const { sigma0, Tag, Nonce, adm, r } = sigma;
  const h = Object.keys(obj).map((key) =>
    adm.includes(key)
      ? CHash(pksan, Tag, { key, value: obj[key] }, r[adm.indexOf(key)])
      : obj[key]
  );

  console.log("Verify - h:", h);

  const isValid = SVF(pksig, { h, pksan, adm }, sigma0);
  if (isValid) {
    const originalH = Object.keys(obj).map((key) =>
      adm.includes(key)
        ? CHash(pksan, Tag, { key, value: obj[key] }, r[adm.indexOf(key)])
        : obj[key]
    );
    if (JSON.stringify(h) === JSON.stringify(originalH)) {
      return "No modification";
    }
    return true;
  }
  return false;
}

// Example Usage
const obj = {
  resource: "Resource",
  rights: "Access Rights",
  delegationChain: [],
};

const mod = {
  delegationChain: [{ user1: "ID1", rights: "read" }],
};

const { sksig, pksig, prfKey } = KGensig();
console.log(sksig);
console.log(pksig);
console.log(prfKey);

const { sksan, pksan } = KGensan();
console.log(sksan);
console.log(pksan);

const { sigma, signature } = Sign(
  obj,
  sksig,
  pksan,
  ["delegationChain"],
  prfKey
);

console.log("Initial Verification:", Verify(obj, sigma, pksig, pksan));

const {
  objPrime,
  sigmaPrime,
  signature: sanitizedSignature,
} = Sanit(obj, mod, sigma, pksig, sksan);
if (objPrime && sigmaPrime && sanitizedSignature) {
  console.log("Sanitized Object:", objPrime);
  console.log(
    "Sanitized Verification:",
    Verify(objPrime, sigmaPrime, pksig, pksan)
  );
  console.log("Signature Before Sanitization:", signature);
  console.log("Signature After Sanitization:", sanitizedSignature);
  console.log(
    "Sign and Sanitize Signatures Match:",
    signature === sanitizedSignature
  );
} else {
  console.log("Sanitization failed");
}
