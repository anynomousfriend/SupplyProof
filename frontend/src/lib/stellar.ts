// @ts-nocheck
import * as StellarSdk from "@stellar/stellar-sdk";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { Networks } from "@creit.tech/stellar-wallets-kit";

export const rpc = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org");
export const networkPassphrase = StellarSdk.Networks.TESTNET;

// Soroban Symbol only allows [a-zA-Z0-9_], max 32 chars.
// Sanitize user input before converting.
function toSymbolSafe(input: string): string {
  return input.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32);
}

// Mutable contract IDs with setters
export let REGISTRY_CONTRACT_ID = "";
export const setRegistryContractId = (id: string) => { REGISTRY_CONTRACT_ID = id; };

export let TRACKER_CONTRACT_ID = "";
export const setTrackerContractId = (id: string) => { TRACKER_CONTRACT_ID = id; };

StellarWalletsKit.init({
  network: Networks.TESTNET,
  modules: defaultModules(),
});

export const kit = StellarWalletsKit;

// ─── Submit Transaction (send + poll for completion) ─────────────────────────
export async function submitTransaction(signedXdr: string) {
  try {
    let transaction;
    try {
      transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    } catch (e: any) {
      throw new Error(`fromXDR failed: ${e.message}`);
    }

    let response;
    try {
      response = await rpc.sendTransaction(transaction);
    } catch (e: any) {
      throw new Error(`sendTransaction failed: ${e.message}`);
    }

    if (response.status === "ERROR") {
      throw new Error(`Transaction failed: ${response.errorResult}`);
    }

    // Poll for completion
    let getResponse;
    try {
      getResponse = await rpc.getTransaction(response.hash);
      while (getResponse.status === "NOT_FOUND") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResponse = await rpc.getTransaction(response.hash);
      }
    } catch (e: any) {
      throw new Error(`getTransaction failed: ${e.message}`);
    }

    if (getResponse.status === "SUCCESS") {
      return {
        hash: response.hash,
        result: getResponse.returnValue,
      };
    }

    throw new Error(`Transaction failed: ${getResponse.status}`);
  } catch (e: any) {
    throw new Error(`[submitTransaction] ${e.message}`);
  }
}

// ─── Hash Product ID (SHA-256 of name → hex) ────────────────────────────────
export async function hashProductId(name: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(name);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (e: any) {
    throw new Error(`[hashProductId] ${e.message}`);
  }
}

// ─── Register Product ────────────────────────────────────────────────────────
export async function invokeRegisterProduct(sourceAddress: string, productIdHex: string, name: string) {
  try {
    const account = await rpc.getAccount(sourceAddress);
    const contract = new StellarSdk.Contract(REGISTRY_CONTRACT_ID);

    const productIdBytes = StellarSdk.xdr.ScVal.scvBytes(Buffer.from(productIdHex, "hex"));
    const nameVal = StellarSdk.nativeToScVal(toSymbolSafe(name), { type: "symbol" });

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          "register_product",
          StellarSdk.Address.fromString(sourceAddress).toScVal(),
          productIdBytes,
          nameVal
        )
      )
      .setTimeout(180)
      .build();

    let simulation;
    try {
      simulation = await rpc.simulateTransaction(transaction);
    } catch (e: any) {
      throw new Error(`rpc.simulateTransaction failed: ${e.message}`);
    }

    if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    try {
      transaction = StellarSdk.rpc.assembleTransaction(transaction, simulation).build();
      return transaction.toXDR();
    } catch (e: any) {
      throw new Error(`assembleTransaction/toXDR failed: ${e.message}`);
    }
  } catch (e: any) {
    throw new Error(`[invokeRegisterProduct] ${e.message}`);
  }
}

// ─── Add Handler ─────────────────────────────────────────────────────────────
export async function invokeAddHandler(sourceAddress: string, productIdHex: string, handlerAddress: string, role: string) {
  try {
    const account = await rpc.getAccount(sourceAddress);
    const contract = new StellarSdk.Contract(REGISTRY_CONTRACT_ID);

    const productIdBytes = StellarSdk.xdr.ScVal.scvBytes(Buffer.from(productIdHex, "hex"));
    const handlerVal = StellarSdk.Address.fromString(handlerAddress).toScVal();
    const roleVal = StellarSdk.nativeToScVal(toSymbolSafe(role), { type: "symbol" });

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          "add_handler",
          StellarSdk.Address.fromString(sourceAddress).toScVal(),
          productIdBytes,
          handlerVal,
          roleVal
        )
      )
      .setTimeout(180)
      .build();

    let simulation;
    try {
      simulation = await rpc.simulateTransaction(transaction);
    } catch (e: any) {
      throw new Error(`rpc.simulateTransaction failed: ${e.message}`);
    }

    if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    try {
      transaction = StellarSdk.rpc.assembleTransaction(transaction, simulation).build();
      return transaction.toXDR();
    } catch (e: any) {
      throw new Error(`assembleTransaction/toXDR failed: ${e.message}`);
    }
  } catch (e: any) {
    throw new Error(`[invokeAddHandler] ${e.message}`);
  }
}

// ─── Record Checkpoint ───────────────────────────────────────────────────────
export async function invokeRecordCheckpoint(sourceAddress: string, productIdHex: string, location: string, status: string) {
  try {
    const account = await rpc.getAccount(sourceAddress);
    const contract = new StellarSdk.Contract(TRACKER_CONTRACT_ID);

    const productIdBytes = StellarSdk.xdr.ScVal.scvBytes(Buffer.from(productIdHex, "hex"));
    const locationVal = StellarSdk.nativeToScVal(toSymbolSafe(location), { type: "symbol" });
    const statusVal = StellarSdk.nativeToScVal(toSymbolSafe(status), { type: "symbol" });

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          "record_checkpoint",
          StellarSdk.Address.fromString(sourceAddress).toScVal(),
          productIdBytes,
          locationVal,
          statusVal
        )
      )
      .setTimeout(180)
      .build();

    let simulation;
    try {
      simulation = await rpc.simulateTransaction(transaction);
    } catch (e: any) {
      throw new Error(`rpc.simulateTransaction failed: ${e.message}`);
    }

    if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    try {
      transaction = StellarSdk.rpc.assembleTransaction(transaction, simulation).build();
      return transaction.toXDR();
    } catch (e: any) {
      throw new Error(`assembleTransaction/toXDR failed: ${e.message}`);
    }
  } catch (e: any) {
    throw new Error(`[invokeRecordCheckpoint] ${e.message}`);
  }
}

// ─── Fetch Checkpoints (simulation-based read) ──────────────────────────────
export async function fetchCheckpoints(productIdHex: string) {
  try {
    const contract = new StellarSdk.Contract(TRACKER_CONTRACT_ID);
    const productIdBytes = StellarSdk.xdr.ScVal.scvBytes(Buffer.from(productIdHex, "hex"));

    // Use a throwaway keypair for read-only simulation
    const keypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(keypair.publicKey(), "0");

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call("get_checkpoints", productIdBytes))
      .setTimeout(30)
      .build();

    const sim = await rpc.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(sim)) return [];
    if (StellarSdk.rpc.Api.isSimulationSuccess(sim) && sim.result) {
      return StellarSdk.scValToNative(sim.result.retval);
    }
    return [];
  } catch (e: any) {
    console.error(`[fetchCheckpoints] ${e.message}`);
    return [];
  }
}

// ─── Fetch Product (simulation-based read) ───────────────────────────────────
export async function fetchProduct(productIdHex: string) {
  try {
    const contract = new StellarSdk.Contract(REGISTRY_CONTRACT_ID);
    const productIdBytes = StellarSdk.xdr.ScVal.scvBytes(Buffer.from(productIdHex, "hex"));

    const keypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(keypair.publicKey(), "0");

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call("get_product", productIdBytes))
      .setTimeout(30)
      .build();

    const sim = await rpc.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(sim)) return null;
    if (StellarSdk.rpc.Api.isSimulationSuccess(sim) && sim.result) {
      return StellarSdk.scValToNative(sim.result.retval);
    }
    return null;
  } catch (e: any) {
    console.error(`[fetchProduct] ${e.message}`);
    return null;
  }
}

// ─── Fetch Events ────────────────────────────────────────────────────────────
export async function fetchEvents() {
  try {
    const latestLedger = await rpc.getLatestLedger();
    const startLedger = latestLedger.sequence - 1000; // last ~1.5 hours

    const filters = [];

    if (TRACKER_CONTRACT_ID) {
      filters.push({
        type: "contract",
        contractIds: [TRACKER_CONTRACT_ID],
        topics: [
          [StellarSdk.xdr.ScVal.scvSymbol("chk_rec").toXDR("base64")]
        ],
      });
    }

    if (REGISTRY_CONTRACT_ID) {
      filters.push({
        type: "contract",
        contractIds: [REGISTRY_CONTRACT_ID],
        topics: [
          [StellarSdk.xdr.ScVal.scvSymbol("prod_reg").toXDR("base64")]
        ],
      });
    }

    if (filters.length === 0) return [];

    const events = await rpc.getEvents({
      startLedger,
      filters,
    });

    return events.events;
  } catch (e: any) {
    console.error(`[fetchEvents] ${e.message}`);
    return [];
  }
}
