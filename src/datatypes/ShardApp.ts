import Node from './Node';
import { cyrb53 } from '../utils';
import Partition from './Partition';
import { MAX_KEY_SPACE, MAX_PARTITION_SIZE } from '../constants';

class ShardApp {
	nodes: Node[];
	callbackFn: React.Dispatch<React.SetStateAction<ShardAppState>>;

	// Create first node stores the first partition
	constructor(callbackFn: React.Dispatch<React.SetStateAction<ShardAppState>>) {
		this.nodes = [];
		this.callbackFn = callbackFn;

		const firstPart = new Partition(0, MAX_KEY_SPACE);
		const firstNode = this.createNode([firstPart]);
		this.nodes.push(firstNode);
		console.log(this.nodes);
	}

	createNode(partitions?: Partition[]) {
		const n = new Node(this.nodes.length, partitions);
		return n;
	}

	getPartitionKey(p: Partition) {
		return `${p.minKey}-${p.maxKey}`;
	}

	// Insert value into partition, split partition if necessary
	insert(value: any) {
		const hash = cyrb53(value.Name) % MAX_KEY_SPACE;
		const node = this.findNodeWithKey(hash);
		if (!node) {
			console.error(`No node to handle key ${hash}, value: ${value}, nodes: ${this.nodes}`);
			return;
		}

		const partition = node.getPartitionFor(hash);
		if (!partition) {
			console.error(`Unable to find partition for key ${hash}`);
			return;
		}

		console.log(`Inserting into partition with keys ${this.getPartitionKey(partition)}`)
		partition.data.push(value);
		if (partition.data.length > MAX_PARTITION_SIZE) {
			console.log("Splitting partition");
			this.splitPartition(partition);
			console.log(this.nodes);
		}
		this.callbackFn(this.getState())
	}

	// Split partition in two, have first node keep
	splitPartition(p: Partition) {
		if (p.minKey === p.maxKey) {
			console.error(`Unable to split partition of 1 key: ${p}`);
			return;
		}

		const mid = p.minKey + Math.floor((p.maxKey - p.minKey) / 2);
		const part1 = new Partition(p.minKey, mid);
		const part2 = new Partition(mid + 1, p.maxKey);

		// Insert data into the correct partition, TODO: Improve performance
		for (const value of p.data) {
			const hash = cyrb53(value.Name) % MAX_KEY_SPACE;
			(part1.minKey <= hash && hash <= part1.maxKey) ? part1.data.push(value) : part2.data.push(value);
		}

		const leastBusyNode = this.getLeastBusyNode();
		const originalNode = this.findNodeWithKey(p.minKey); // Node that currently stores 'p'
		if (!originalNode) {
			console.error(`Unable to find node handling range ${p.minKey} - ${p.maxKey}. Got ${originalNode}`)
			return
		}

		// Have nodes update their partitions
		originalNode.updatePartition(p, part1);
		leastBusyNode.insertPartition(part2);

		// Possible that splitting didn't balance the partitions, all the values might
		// belong to the first or second half of the key range for the partition.
		// Try splitting again until we can no longer split(minKey === maxKey).
		if (part1.data.length > MAX_PARTITION_SIZE)
			this.splitPartition(part1);
		if (part2.data.length > MAX_PARTITION_SIZE)
			this.splitPartition(part2);
	}

	// TODO: Improve performance?
	findNodeWithKey(hash: number) {
		for (const node of this.nodes) {
			for (const part of node.partitions) {
				if (part.minKey <= hash && hash <= part.maxKey)
					return node;
			}
		}
	}

	// Returns the node with the least amount of records
	getLeastBusyNode() {
		let maxDataCount = 0;
		let n: Node = this.nodes[0];

		for (const node of this.nodes) {
			let dataCount = 0;
			for (const part of node.partitions) {
				dataCount += part.data.length;
			}

			if (dataCount > maxDataCount) {
				n = node;
				maxDataCount = dataCount;
			}
		}
		return n;
	}

	// Information about the nodes and partitions
	getState() {
		return { nodes: this.nodes };
	}
}

export type ShardAppState = {
	nodes: Node[];
}

export default ShardApp;