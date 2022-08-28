# Sharding
## A sharding/partitioning application with dynamic rebalancing and key hashing

### Layers:
1. ShardApp: Keeps track of the nodes and their partitions, forwards data requests to the correct node(s), and handles rebalancing
2. Nodes: Stores partitions

### How it works:
- Starts off with 1 node and 1 partition that handles all keys
- Records from dataset.js are sent to the router
- The router hashes and forwards the data to the correct partition
- Partitions will split in half once they exceed `MAX_PARTITION_SIZE`
	- One half of the partition remains on the node
	- The other half of the partition is copied to another node
	- The router is made aware of this split
- Partitions will merge with an adjacent partition if its size falls below `MIN_PARTITION_SIZE` and the adjacent partition(s) can fit the records
- There can be any number of partitions and multiple partitions on a single node
- Nodes can be added/removed from the UI
	- It will trigger a rebalancing

### Edge cases:
- Partition of 1 key that exceeds `MAX_PARTITION_SIZE`