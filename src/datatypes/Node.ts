// import { cyrb53 } from '../utils';
import Partition from './Partition';
// import { MAX_KEY_SPACE } from '../constants';

// TIDIL Guve nodes IDs
class Node {
	id: number;
	partitions: Partition[];

	constructor(id: number, partitions?: Partition[]) {
		this.id = id;
		this.partitions = partitions || [];
	}

	getPartitionFor(hash: number) {
		for (const p of this.partitions) {
			if (p.minKey <= hash && hash <= p.maxKey) {
				return p;
			}
		}
	}

	updatePartition(current: Partition, updated: Partition) {
		for (let i = 0; i < this.partitions.length; i++) {
			if (this.partitions[i].minKey === current.minKey && this.partitions[i].maxKey === current.maxKey) {
				this.partitions[i] = updated;
				return;
			}
		}
	}

	insertPartition(p: Partition) {
		this.partitions.push(p);
	}

	deletePartition(p: Partition) {
		this.partitions = this.partitions.filter(currP => currP.minKey !== p.minKey && currP.maxKey !== p.maxKey);
	}

	getBiggestPartition() {
		if (!this.partitions.length)
			return;

		let part = this.partitions[0];
		let count = this.partitions[0].data.length;
		for (const p of this.partitions) {
			if (p.data.length > count)
				part = p
		}
		return part;
	}
}

export default Node;