#!/bin/bash
set -e

REGISTRY="CAL7GDXL244YD546AQER74DA6CSDKFBGQYTSTJKOR65NSQXKKN774ATC"
TRACKER="CAUWYU6P427GD5CDU4WGCCPHEYZZOJGZGAGJPA6NVI463KAEV6N2JDII"
ADMIN="GCRCEGXDHRCN6ZDG5UBWL5XH4EDOVXQEIL46NGRONG4PBZIGFALFCEH2"
PRODUCT_ID="1234567890123456789012345678901234567890123456789012345678901234"

echo "Initializing Tracker..."
stellar contract invoke --network testnet --source my-admin-key --id $TRACKER -- initialize --registry_address $REGISTRY --admin $ADMIN || echo "Already initialized or error"

echo "Registering Product..."
stellar contract invoke --network testnet --source my-admin-key --id $REGISTRY -- register_product --owner $ADMIN --product_id $PRODUCT_ID --name "StellarMotors" || echo "Product already registered"

echo "Adding handler (on Registry)..."
stellar contract invoke --network testnet --source my-admin-key --id $REGISTRY -- add_handler --owner $ADMIN --product_id $PRODUCT_ID --handler $ADMIN --role "Distributor"

echo "Recording checkpoint (on Tracker)..."
stellar contract invoke --network testnet --source my-admin-key --id $TRACKER -- record_checkpoint --handler $ADMIN --product_id $PRODUCT_ID --location "WarehouseB" --status "InTransit"

echo "Fetching product details from Registry..."
stellar contract invoke --network testnet --source my-admin-key --id $REGISTRY -- get_product --product_id $PRODUCT_ID

echo "Fetching checkpoints from Tracker..."
stellar contract invoke --network testnet --source my-admin-key --id $TRACKER -- get_checkpoints --product_id $PRODUCT_ID

echo "End to end test complete!"
