import Node from './Node';
import { cyrb53 } from '../utils';
import Partition from './Partition';
import { MAX_KEY_SPACE } from '../config';

class ShardApp {
	nodes: Node[];
	nextNodeID: number;
	callbackFn: React.Dispatch<React.SetStateAction<ShardAppState>>;

	// Create first node which stores the first partition
	constructor(callbackFn: React.Dispatch<React.SetStateAction<ShardAppState>>) {
		this.nodes = [];
		this.nextNodeID = 0;
		this.callbackFn = callbackFn;
		this.createNode([new Partition(0, MAX_KEY_SPACE)]);
	}

	createNode(partitions?: Partition[]) {
		const n = new Node(this.nextNodeID, partitions);
		this.nodes.push(n);
		this.nextNodeID++;

		if (this.nodes.length > 1)
			this.rebalanceNodes();
	}

	// Rebalance - steal partitions from most busy node and give them to the least
	// busy node while the standard deviation is greater than 1
	// Std Dev of 1 is arbitrary? but means our data is somewhat normally distributed
	// https://en.wikipedia.org/wiki/68–95–99.7_rule
	rebalanceNodes() {
		let tries = 30;
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

		this.invokeCallback();
	}

	// Return the std. dev. based on the number of records each node is holding
	getStdDev() {
		const nodeRowCounts = this.nodes.map(n => this.getRowCount(n));
		const mean = nodeRowCounts.reduce((prev, curr) => prev + curr) / this.nodes.length;
		const squaredTerms = nodeRowCounts.map(count => Math.pow(count - mean, 2))
		const numerator = squaredTerms.reduce((prev, curr) => prev + curr);
		return Math.sqrt(Math.pow(numerator, 2) / this.nodes.length);
	}

	// Insert value into partition, split partition if necessary
	insert(value: any) {
		const hash = cyrb53(value.Name) % MAX_KEY_SPACE;
		value.hash = hash;
		const node = this.findNodeWithKey(hash);
		if (!node) {
			console.error(`No node to handle key ${hash}, value: ${value}, nodes: ${this.nodes}`);
			return;
		}

		node.insertData(value);
		this.invokeCallback()
	}

	invokeCallback() {
		this.callbackFn(this.getState());
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
		this.nextNodeID = 0;
		this.createNode([new Partition(0, MAX_KEY_SPACE)]);
		this.invokeCallback();
	}

	// Delete the node from the array and assign it's partitions to other nodes
	deleteNode(id: number) {
		const node = this.nodes.filter(n => n.id === id)[0];
		this.nodes = this.nodes.filter(n => n.id !== id);
		node.partitions.forEach(p => this.getLeastBusyNode().insertPartition(p))
		this.invokeCallback();
	}
}

export type ShardAppState = {
	nodes: Node[];
}

export default ShardApp;