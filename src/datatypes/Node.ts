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

	// insert(value: any) {
	// 	const hash = cyrb53(value.Name) % MAX_KEY_SPACE;

	// 	for (const p of this.partitions) {
	// 		if (p.minKey <= hash && hash <= p.maxKey) {
	// 			p.data.push(value);
	// 			console.log(`Inserted ${value} into partition ${p}`);
	// 			return;
	// 		}
	// 	}
	// 	console.error(`Unable to find partition for key ${hash}, value: ${value}`)
	// }
}

export default Node;