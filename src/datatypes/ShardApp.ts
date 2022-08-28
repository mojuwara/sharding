import Node from './Node';
import { cyrb53 } from '../utils';
import Partition from './Partition';
import { MAX_KEY_SPACE, MAX_PARTITION_SIZE } from '../constants';

class ShardApp {
	numNodes: number;
	keyToNodeMap: Map<string, Node>; // Maps a string 'minKey-maxKey' to the node handling that key range
	callbackFn: React.Dispatch<React.SetStateAction<ShardAppState>>;

	// Create first node stores the first partition
	constructor(callbackFn: React.Dispatch<React.SetStateAction<ShardAppState>>) {
		this.numNodes = 0;
		this.callbackFn = callbackFn;
		this.keyToNodeMap = new Map<string, Node>();

		const initPart = new Partition(0, MAX_KEY_SPACE);
		const initNode = this.createNode([initPart]);
		this.keyToNodeMap.set(this.getPartitionKey(initPart), initNode);
		console.log(this.keyToNodeMap);
	}

	createNode(partitions?: Partition[]) {
		const n = new Node(this.numNodes, partitions);
		this.numNodes++;
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
			console.error(`No node to handle key ${hash}, value: ${value}, map: ${this.keyToNodeMap}`);
			return;
		}

		const partition = node.getPartitionFor(hash);
		if (!partition) {
			console.error(`Unable to find partition for key ${hash}`)
			return;
		}

		console.log(`Inserting into partition with keys ${this.getPartitionKey(partition)}`)
		partition.data.push(value);
		if (partition.data.length > MAX_PARTITION_SIZE) {
			console.log("Splitting partition")
			this.splitPartition(partition)
			console.log(this.keyToNodeMap)
		}
		this.callbackFn(this.getState())
	}

	splitPartition(p: Partition) {
		if (p.minKey === p.maxKey) {
			console.error(`Unable to split partition of 1 key: ${p}`)
			return
		}

		const mid = p.minKey + Math.floor((p.maxKey - p.minKey) / 2);
		const part1 = new Partition(p.minKey, mid)
		const part2 = new Partition(mid + 1, p.maxKey)

		// Insert data into the correct partition, TODO: Improve performance
		for (const value of p.data) {
			const hash = cyrb53(value.Name) % MAX_KEY_SPACE;
			(part1.minKey <= hash && hash <= part1.maxKey) ? part1.data.push(value) : part2.data.push(value);
		}

		const leastBusyNode = this.getLeastBusyNode()
		const originalNode = this.keyToNodeMap.get(this.getPartitionKey(p)); // Node that currently stores 'p'
		if (!originalNode) {
			console.error(`Unable to find node handling range ${p.minKey} - ${p.maxKey}. Got ${originalNode}`)
			return
		}

		// update partition mapping
		this.keyToNodeMap.delete(this.getPartitionKey(p))
		this.keyToNodeMap.set(this.getPartitionKey(part1), originalNode)
		this.keyToNodeMap.set(this.getPartitionKey(part2), leastBusyNode)

		// Have nodes update their partitions
		originalNode.updatePartition(p, part1);
		leastBusyNode.insertPartition(part2);
	}

	// TODO: Fix type annotations, currently infers 'any'
	findNodeWithKey(hash: number) {
		for (const [range, node] of this.keyToNodeMap) {
			const [rangeStart, rangeEnd] = range.split('-').map(val => parseInt(val, 10));
			if (rangeStart <= hash && hash <= rangeEnd)
				return node;
		}
	}

	// Returns the node with the least amount of records
	getLeastBusyNode() {
		let maxDataCount = 0;
		let n: Node = this.keyToNodeMap.values().next().value;	// Init with first node

		for (const node of this.keyToNodeMap.values()) {
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

	// Information about the nodes and partitions, TODO: more efficient way to get unique nodes
	getState() {
		const uniqueNodes = new Map<number, Node>();
		this.keyToNodeMap.forEach((node) => uniqueNodes.set(node.id, node));

		return { nodes: Array.from(uniqueNodes.values()) };
	}
}

export type ShardAppState = {
	nodes: Node[];
}

export default ShardApp;