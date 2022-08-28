import { useEffect, useRef, useState } from 'react';
import './App.css';

import {data} from './dataset'
import Node from './datatypes/Node';
import Partition from './datatypes/Partition';
import ShardApp, { ShardAppState } from './datatypes/ShardApp';

// TODO: Shuffle dataset
function App() {
	const ndx = useRef(0);
	const [appState, setAppState] = useState<ShardAppState>({nodes: []});
	const shardApp = useRef<ShardApp>(new ShardApp(setAppState));

	// useEffect(() => {setInterval(insertData, 3000)}, []);

	// function insertData() {
	// 	if (ndx.current < data.length) {
	// 		shardApp.current.insert(data[ndx.current])
	// 		ndx.current++;
	// 	}
	// }

	console.log(appState);
	appState.nodes.forEach(node => node.partitions.sort((a, b) => a.minKey - b.minKey))

  return (
    <div className="App">
			{appState.nodes.map((node: Node, ndx: number) => (
				<span key={ndx}>
					<h3>{`Node: ${ndx}`}</h3>
					{node.partitions.map((part: Partition, n: number) => (
						<div key={n}>
							<h3>Partition with keys: {`${part.minKey} - ${part.maxKey}`}</h3>
							{part.data.map((d, n) => <p key={n}>{d.Name}</p>)}
						</div>
					))}
					<br />
				</span>
				)
			)}
    </div>
  );
}

export default App;
