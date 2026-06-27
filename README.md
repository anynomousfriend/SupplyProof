<div align="center">
  <img src="./frontend/public/logo.svg" width="128" height="128" alt="SupplyProof Logo" />
  <h1>SupplyProof</h1>
  <p><em>Supply Chain Checkpoint Verification on Stellar</em></p>
  <br />
  <video src="https://github.com/anynomousfriend/SupplyProof/raw/main/demo.mp4" autoplay loop muted playsinline style="max-width: 800px; width: 100%; border-radius: 12px;"></video>
</div>
A full-stack Stellar decentralized application (dApp) for recording and verifying supply chain checkpoints on-chain. Built with Rust/Soroban smart contracts and a modern React frontend, SupplyProof provides tamper-proof provenance tracking from origin to retail.

## 🎯 Problem Statement

"Organic," "fair-trade," and "locally sourced" labels are unverifiable. Consumers have to trust the brand's word. Small producers can't prove their provenance. SupplyProof solves this by recording every supply chain checkpoint on the Stellar blockchain — creating an immutable, publicly verifiable journey for any product.

## ✨ Features

- **Product Registration** — Register products/batches on-chain with unique identifiers
- **Handler Authorization** — Only approved handlers can record checkpoints for a product
- **Checkpoint Recording** — Record location, status, and handler at each supply chain stage
- **Consumer Verification** — Anyone can verify a product's complete journey by its ID
- **Real-time Events** — Event streaming via Soroban events for live dashboard updates
- **Multi-Wallet Support** — Connect via Freighter or other Stellar wallet extensions
- **Inter-Contract Communication** — CheckpointTracker verifies handlers through ProductRegistry

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Register │  │   Add    │  │  Record  │  │ Verify  │ │
│  │ Product  │  │ Handler  │  │Checkpoint│  │ Product │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │             │              │      │
│       └──────────────┴─────────────┴──────────────┘      │
│                          │                               │
│              Stellar Wallets Kit + SDK                   │
└──────────────────────────┬───────────────────────────────┘
                           │
                   Stellar Testnet RPC
                           │
        ┌──────────────────┴───────────────────┐
        │                                      │
  ┌─────┴──────────┐              ┌────────────┴────────┐
  │ ProductRegistry │◄────────────│ CheckpointTracker   │
  │    Contract     │ is_handler()│     Contract        │
  │                 │             │                     │
  │ • register      │             │ • initialize        │
  │ • add_handler   │             │ • record_checkpoint │
  │ • is_handler    │             │ • get_checkpoints   │
  │ • get_product   │             │ • verify_product    │
  └─────────────────┘             └─────────────────────┘
```

## 📦 Deployed Contracts

- **ProductRegistry Contract ID**: `CAL7GDXL244YD546AQER74DA6CSDKFBGQYTSTJKOR65NSQXKKN774ATC`
- **CheckpointTracker Contract ID**: `CAUWYU6P427GD5CDU4WGCCPHEYZZOJGZGAGJPA6NVI463KAEV6N2JDII`

### Test Data

**ProductRegistry Contract ID**:
```text
CAL7GDXL244YD546AQER74DA6CSDKFBGQYTSTJKOR65NSQXKKN774ATC
```

**CheckpointTracker Contract ID**:
```text
CAUWYU6P427GD5CDU4WGCCPHEYZZOJGZGAGJPA6NVI463KAEV6N2JDII
```

**Sample Product Name** (for registration):
```text
Ethiopian Yirgacheffe Coffee Batch 2026-06
```

**Sample Handler Addresses**:
```text
GDRYVYEFO2MKXNYQGTMMVMCVVRPNVBRPSDQFYKGVMWGEXY7DLKAXJMOZ
```

**Sample Checkpoint Data**:
```text
Location: Addis Ababa Processing Facility
Status: processed
```

---

## 🛠️ Installation & Prerequisites

### 1. Install mise (recommended)
[mise](https://mise.jdx.dev/) manages your tool versions. Install it:
```bash
curl https://mise.run | sh
```

### 2. Install dependencies via mise
From the project root:
```bash
mise install
```
This installs:
- **Rust** (latest stable) — for smart contract compilation
- **Node.js 22** — for the frontend

### 3. Add the WebAssembly Target
```bash
rustup target add wasm32v1-none
```

### 4. Install the Stellar CLI
```bash
# For Linux x86_64:
curl -sSL https://github.com/stellar/stellar-cli/releases/download/v27.0.0/stellar-cli-27.0.0-x86_64-unknown-linux-gnu.tar.gz | tar -xz
mv stellar ~/.local/bin/stellar
```
*(Make sure `~/.local/bin` is in your `PATH`)*

---

## 🖥️ How to Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🚀 How to Build and Deploy the Contracts

### Build

```bash
cd contracts
stellar contract build --package product-registry
stellar contract build --package checkpoint-tracker
```

### Generate Testnet Identity

```bash
stellar keys generate deployer --network testnet
```

### Deploy ProductRegistry

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/product_registry.wasm \
  --source-account deployer \
  --network testnet
```

Save the output Contract ID.

### Deploy CheckpointTracker

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/checkpoint_tracker.wasm \
  --source-account deployer \
  --network testnet
```

Save the output Contract ID.

### Initialize CheckpointTracker

Link the CheckpointTracker to the ProductRegistry:
```bash
stellar contract invoke \
  --id <TRACKER_CONTRACT_ID> \
  --source-account deployer \
  --network testnet \
  -- \
  initialize \
  --admin deployer \
  --registry_address <REGISTRY_CONTRACT_ID>
```

### Update the Frontend

Paste both Contract IDs into the Configuration section of the React app.

---

## 🧪 Running Tests

### Smart Contract Tests
```bash
cd contracts
cargo test --workspace -- --nocapture
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## 🔄 CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every push and PR to `main`:

1. **Contract Job**: Installs Rust + Stellar CLI → runs `cargo test` → builds WASM artifacts
2. **Frontend Job**: Installs Node.js → `npm ci` → lint → test → production build
3. **Deploy Job**: Deploys the frontend to Vercel (on main branch pushes)

---

## 📝 How to Use the App

### Step 1: Config
Copy and paste these contract IDs into the first tab:
• **Product Registry ID:** `CAL7GDXL244YD546AQER74DA6CSDKFBGQYTSTJKOR65NSQXKKN774ATC`
• **Logistics Tracker ID:** `CAUWYU6P427GD5CDU4WGCCPHEYZZOJGZGAGJPA6NVI463KAEV6N2JDII`

### Step 2: Mint
• **Product Identifier:** Try something like `StellarMotors Engine Block` or `Ethiopian Coffee Batch 092`
*(This will automatically generate a hashed hex ID which will be auto-filled in the subsequent steps)*

### Step 3: Roles
• **Stellar Address:** Click the input field and select your currently connected wallet address (it will pop up as a suggestion!).
• **Assign Role:** Pick any role (e.g., `Manufacturer` or `Distributor`).

### Step 4: Track
• **Target Product ID:** (Auto-filled)
• **Location:** e.g., `Warehouse B` or `Port of Long Beach`
• **Status:** e.g., `In Transit` or `Cleared Customs`

### Step 5: Audit
• **Product ID Hex:** Click the input and select the current active product ID from the suggestions.
• Click **Audit** to see the timeline!

---

## 📁 Project Structure

```
SupplyProof/
├── .github/workflows/ci.yml     # CI/CD pipeline
├── contracts/                    # Soroban smart contracts
│   ├── Cargo.toml                # Workspace config
│   ├── mise.toml                 # Rust toolchain version
│   ├── product_registry/         # Product & handler management
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── checkpoint_tracker/       # Checkpoint recording & verification
│       ├── Cargo.toml
│       └── src/lib.rs
├── frontend/                     # React + Vite frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── vercel.json
│   ├── index.html
│   ├── public/logo.svg
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.test.tsx
│       ├── index.css
│       └── lib/stellar.ts
├── mise.toml                     # Project-wide tool versions
├── .gitignore
└── README.md
```

## 🛡️ Smart Contract Details

### ProductRegistry Contract

| Function | Description | Auth Required |
|----------|-------------|---------------|
| `register_product` | Register a new product with unique ID | Owner |
| `add_handler` | Authorize a handler for a product | Owner |
| `is_handler` | Check if address is authorized handler | None |
| `get_product` | Retrieve product information | None |
| `get_product_count` | Get total registered products | None |

### CheckpointTracker Contract

| Function | Description | Auth Required |
|----------|-------------|---------------|
| `initialize` | Set ProductRegistry address | Admin |
| `record_checkpoint` | Record a supply chain checkpoint | Handler (verified cross-contract) |
| `get_checkpoints` | Get all checkpoints for a product | None |
| `get_checkpoint_count` | Get checkpoint count for a product | None |
| `verify_product` | Consumer verification endpoint | None |

### Events Emitted

| Event Topic | Contract | Data |
|-------------|----------|------|
| `prod_reg` | ProductRegistry | Product struct |
| `hndl_add` | ProductRegistry | Handler address + role |
| `chk_rec` | CheckpointTracker | Checkpoint struct |

---

## 🌐 Live Demo

- **Frontend**: [TO BE FILLED — Vercel/Netlify link]
- **Demo Video**: [Watch the walkthrough video](./demo.mp4)

## 📜 License

MIT
