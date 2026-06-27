#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
    Symbol,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Product {
    pub owner: Address,
    pub product_id: BytesN<32>,
    pub name: Symbol,
    pub handler_count: u32,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Product(BytesN<32>),
    Handler(BytesN<32>, Address),
    ProductCount,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ProductExists = 1,
    ProductNotFound = 2,
    NotOwner = 3,
    HandlerExists = 4,
    InvalidInput = 5,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct ProductRegistry;

#[contractimpl]
impl ProductRegistry {
    /// Register a new product on-chain.
    ///
    /// The caller (`owner`) must authorize the transaction.  An event with
    /// topic `prod_reg` is emitted on success.
    pub fn register_product(
        env: Env,
        owner: Address,
        product_id: BytesN<32>,
        name: Symbol,
    ) -> Result<(), Error> {
        owner.require_auth();

        let key = DataKey::Product(product_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::ProductExists);
        }

        let product = Product {
            owner: owner.clone(),
            product_id: product_id.clone(),
            name: name.clone(),
            handler_count: 0,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &product);

        // Increment global product counter.
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::ProductCount)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::ProductCount, &(count + 1));

        env.events()
            .publish((symbol_short!("prod_reg"), product_id), (owner, name));

        Ok(())
    }

    /// Authorize a handler for a given product.
    ///
    /// Only the product owner may call this.  Emits `hndl_add` on success.
    pub fn add_handler(
        env: Env,
        owner: Address,
        product_id: BytesN<32>,
        handler: Address,
        role: Symbol,
    ) -> Result<(), Error> {
        owner.require_auth();

        let product_key = DataKey::Product(product_id.clone());
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&product_key)
            .ok_or(Error::ProductNotFound)?;

        if product.owner != owner {
            return Err(Error::NotOwner);
        }

        let handler_key = DataKey::Handler(product_id.clone(), handler.clone());
        if env.storage().persistent().has(&handler_key) {
            return Err(Error::HandlerExists);
        }

        env.storage().persistent().set(&handler_key, &role);

        product.handler_count += 1;
        env.storage().persistent().set(&product_key, &product);

        env.events()
            .publish((symbol_short!("hndl_add"), product_id), (handler, role));

        Ok(())
    }

    /// Returns `true` when `handler` is an authorized handler for the product.
    pub fn is_handler(env: Env, product_id: BytesN<32>, handler: Address) -> bool {
        let key = DataKey::Handler(product_id, handler);
        env.storage().persistent().has(&key)
    }

    /// Retrieve the full `Product` record.
    pub fn get_product(env: Env, product_id: BytesN<32>) -> Result<Product, Error> {
        let key = DataKey::Product(product_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(Error::ProductNotFound)
    }

    /// Total number of products registered.
    pub fn get_product_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ProductCount)
            .unwrap_or(0)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_register_product() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ProductRegistry, ());
        let client = ProductRegistryClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let product_id = BytesN::from_array(&env, &[1u8; 32]);
        let name = symbol_short!("Widget");

        client.register_product(&owner, &product_id, &name);

        let product = client.get_product(&product_id);
        assert_eq!(product.owner, owner);
        assert_eq!(product.name, name);
        assert_eq!(product.handler_count, 0);
        assert_eq!(client.get_product_count(), 1);
    }

    #[test]
    fn test_add_handler() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ProductRegistry, ());
        let client = ProductRegistryClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let handler = Address::generate(&env);
        let product_id = BytesN::from_array(&env, &[2u8; 32]);
        let name = symbol_short!("Gadget");
        let role = symbol_short!("shipper");

        client.register_product(&owner, &product_id, &name);
        client.add_handler(&owner, &product_id, &handler, &role);

        assert!(client.is_handler(&product_id, &handler));

        let product = client.get_product(&product_id);
        assert_eq!(product.handler_count, 1);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_duplicate_product_error() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ProductRegistry, ());
        let client = ProductRegistryClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let product_id = BytesN::from_array(&env, &[3u8; 32]);
        let name = symbol_short!("Dupe");

        client.register_product(&owner, &product_id, &name);
        // Second registration of the same product_id must fail.
        client.register_product(&owner, &product_id, &name);
    }

    #[test]
    fn test_unauthorized_handler_check() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ProductRegistry, ());
        let client = ProductRegistryClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let non_handler = Address::generate(&env);
        let product_id = BytesN::from_array(&env, &[4u8; 32]);
        let name = symbol_short!("Secure");

        client.register_product(&owner, &product_id, &name);

        // An address that was never added as a handler must return false.
        assert!(!client.is_handler(&product_id, &non_handler));
    }
}
