class Partition {
	minKey: number;
	maxKey: number;
	data: Array<any>;

	constructor(min: number, max: number, data?: any[]) {
		this.minKey = min;
		this.maxKey = max;
		this.data = data || [];
	}

	length() {
		return this.data.length;
	}
}

export default Partition