import { cyrb53 } from '../utils';
import Partition from './Partition';
import { MAX_KEY_SPACE, MAX_PARTITION_SIZE } from '../config';

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

	insertData(d: any) {
		const partition = this.getPartitionFor(d.hash);
		if (!partition) {
			console.error(`Unable to find partition for key ${d.hash}`);
			return;
		}

		partition.data.push(d);
		if (partition.length() > MAX_PARTITION_SIZE) {
			this.splitPartition(partition);
		}
	}

	// Split partition in two, have first node keep
	splitPartition(p: Partition) {
		if (p.minKey === p.maxKey) {
			console.log(`Unable to split partition of 1 key: ${p}`);
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

		// Replace existing partition with just part1, add part2 as new partition
		this.updatePartition(p, part1);
		this.insertPartition(part2);

		// Possible that splitting didn't balance the partitions, all the values might
		// belong to the first or second half of the key range for the partition.
		// Try splitting again until we can no longer split(minKey === maxKey).
		if (part1.data.length > MAX_PARTITION_SIZE)
			this.splitPartition(part1);
		if (part2.data.length > MAX_PARTITION_SIZE)
			this.splitPartition(part2);
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