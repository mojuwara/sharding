import { useEffect, useRef, useState } from 'react';
import './App.css';

import {data} from './dataset'
import Node from './datatypes/Node';
import Partition from './datatypes/Partition';
import ShardApp, { ShardAppState } from './datatypes/ShardApp';

import IconButton from '@mui/material/IconButton';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

import ClearIcon from '@mui/icons-material/Clear';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import AddIcon from '@mui/icons-material/Add';

// TODO: Shuffle dataset, allow changing MAX_PARTITION_SIZE
function App() {
	const ndx = useRef(0);
	const [appState, setAppState] = useState<ShardAppState>({nodes: []});
	const shardApp = useRef<ShardApp>(new ShardApp(setAppState));
	const [isRunning, setIsRunning] = useState(false);
	const [rowsToInsert, setRowsToInsert] = useState('1');
	const [insertInterval, setInsertInterval] = useState('Once');
	const [intervalID, setIntervalID] = useState<NodeJS.Timer>();
	const [modalOpen, setModalOpen] = useState(false);
	const [modalData, setModalData] = useState<any[]>([]);

	const rowOptions = ['1', '5', '10', '50'];
	const intervalOptions = ['Once', '0.5s', '1s', '3s'];
	// const partitionSizeOptions = ['1', '5', '10', '20'];

	const resetApp = () => {
		setIsRunning(false);
		shardApp.current.reset();
	}

	// TODO: Fix dependency
	useEffect(() => {
		startInterval();
	}, []);

	const startInterval = () => {
		setIntervalID(setInterval(insertData, 5000));
	}

	const stopInterval = () => {
		clearInterval(intervalID);
	}

	const insertData = () => {
		shardApp.current.insert(data[ndx.current]);
		ndx.current++;
	}

	// Pause application while demo is open
	const displayPartitionData = (p: Partition) => {
		stopInterval();
		setModalOpen(true);
		setModalData(p.data);
	}

	appState.nodes.forEach(node => node.partitions.sort((a, b) => a.minKey - b.minKey))

  return (
    <div className="app-container">
			<Dialog open={modalOpen} onClose={() => setModalOpen(false)}>{modalData.map((d, n) => <p key={n}>{d.Name}</p>)}</Dialog>
			<div className='heading'>
				<h2>Partitioning with Dynamic Rebalancing</h2>
				<h3>By Mahamadou Juwara</h3>
			</div>
			<div className="app">
				<div className="toolbar">
					<IconButton aria-label="Reset" onClick={resetApp}>
						<RestartAltIcon />
					</IconButton>
					<IconButton aria-label="Play-resume" onClick={() => setIsRunning(!isRunning)}>
						{(isRunning) ? <PauseCircleIcon /> : <PlayCircleIcon />}
					</IconButton>
					<TextField
						select
						size='small'
						sx={{margin: 1, width: 115}}
						id="rows-to-insert"
						value={rowsToInsert}
						label="Rows to Insert"	// TODO: More succinct way to say this
						onChange={(e) => setRowsToInsert(e.target.value)}
					>
						{rowOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
					</TextField>
					<TextField
						select
						size='small'
						sx={{ margin: 1, width: 100 }}
						id="insert-interval"
						value={insertInterval}
						label="Frequency"
						onChange={(e) => setInsertInterval(e.target.value)}
					>
						{intervalOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
					</TextField>
					{/* <TextField
						select
						size='small'
						id="max-partition-size"
						value={insertInterval}
						label="Max Partition Size"
						helperText="The biggest a single partition is allowed to be"
						onChange={(e) => setMaxPartitionSize(e.target.value)}
					>
						{partitionSizeOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
					</TextField> */}
				</div>
				<div className="node-container">
				{appState.nodes.map((node: Node, ndx: number) => (
					<div key={ndx} className="node">
						<IconButton size='small' aria-label="Delete" onClick={() => shardApp.current.deleteNode(node.id)}>
							<ClearIcon />
						</IconButton>
						<h4>{`Node ${node.id}`}</h4>
						<Divider flexItem />
						<div className="partition-grid">
						{node.partitions.map((part: Partition, n: number) => (
								<Button key={n} variant="contained" size="small" onClick={() => displayPartitionData(part)}>
									{`${part.minKey} - ${part.maxKey}`}
								</Button>
						))}
						</div>
					</div>
					)
				)}
				<IconButton size="large" sx={{width: 150, height: 150}}>
					<AddIcon />
				</IconButton>
				</div>
    	</div>
		</div>
  );
}

export default App;
