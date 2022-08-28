class Partition {
	minKey: number;
	maxKey: number;
	data: Array<any>;

	constructor(min: number, max: number, data?: any[]) {
		this.minKey = min;
		this.maxKey = max;
		this.data = data || [];
	}
}

export default Partition