import Node from './Node';
import { cyrb53 } from '../utils';
import Partition from './Partition';
import { MAX_KEY_SPACE, MAX_PARTITION_SIZE } from '../config';

class ShardApp {
	nodes: Node[];
	callbackFn: React.Dispatch<React.SetStateAction<ShardAppState>>;

	// Create first node which stores the first partition
	constructor(callbackFn: React.Dispatch<React.SetStateAction<ShardAppState>>) {
		this.nodes = [];
		this.callbackFn = callbackFn;
		this.createNode([new Partition(0, MAX_KEY_SPACE)]);
	}

	createNode(partitions?: Partition[]) {
		const n = new Node(this.nodes.length, partitions);
		this.nodes.push(n);

		if (this.nodes.length > 1)
			this.rebalanceNodes();
	}

	// Rebalance - steal partitions from most busy node and give them to the least
	// busy node while the standard deviation is greater than 1
	// Std Dev of 1 is arbitrary? but means our data is somewhat normally distributed
	// https://en.wikipedia.org/wiki/68–95–99.7_rule
	rebalanceNodes() {
		let tries = 5;
		let stdDev = this.getStdDev();
		while (stdDev > 1 && tries) {
			const leastBusy = this.getLeastBusyNode();
			const mostBusy = this.getMostBusyNode();

			const part = mostBusy.getBiggestPartition();
			if (part) {
				mostBusy.deletePartition(part);
				leastBusy.insertPartition(part);
			}
			tries--;
		}

		this.callbackFn(this.getState());
	}

	getStdDev() {
		const nodeRowCounts = this.nodes.map(n => this.getRowCount(n));
		const mean = nodeRowCounts.reduce((prev, curr) => prev + curr) / this.nodes.length;
		const squaredTerms = nodeRowCounts.map(count => Math.pow(count - mean, 2))
		const numerator = squaredTerms.reduce((prev, curr) => prev + curr);
		return Math.sqrt(Math.pow(numerator, 2) / this.nodes.length);
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

	// Sum the number of rows in all the partitions on this node
	getRowCount(n: Node) {
		return n.partitions.map(p => p.data.length).reduce((prev, curr) => prev + curr, 0);
	}

	// Returns the node with the least number of records
	getMostBusyNode() {
		let maxCount = 0;
		let n: Node = this.nodes[0];

		for (const node of this.nodes) {
			let currCount = 0;
			for (const part of node.partitions) {
				currCount += part.data.length;
			}

			if (currCount > maxCount) {
				n = node;
				maxCount = currCount;
			}
		}
		return n;
	}

	// Returns the node with the most number of records
	getLeastBusyNode() {
		let n: Node = this.nodes[0];
		let minCount = this.getRowCount(n);

		for (const node of this.nodes) {
			let currCount = 0;
			for (const part of node.partitions) {
				currCount += part.data.length;
			}

			if (currCount < minCount) {
				n = node;
				minCount = currCount;
			}
		}
		return n;
	}

	// Information about the nodes and partitions
	getState() {
		return { nodes: this.nodes };
	}

	reset() {
		this.nodes = [];
		this.createNode([new Partition(0, MAX_KEY_SPACE)]);
		this.callbackFn(this.getState());
	}

	// Delete the node from the array and assign it's partitions to other nodes
	deleteNode(id: number) {
		const parts = this.nodes.filter(n => n.id === id)[0].partitions;
		this.nodes = this.nodes.filter(n => n.id !== id);

		for (const p of parts) {
			this.getLeastBusyNode().insertPartition(p);
		}
	}
}

export type ShardAppState = {
	nodes: Node[];
}

export default ShardApp;