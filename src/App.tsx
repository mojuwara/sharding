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

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import HelpIcon from '@mui/icons-material/Help';

// TODO: Shuffle dataset, allow changing MAX_PARTITION_SIZE
function App() {
	const ndx = useRef(0);
	const [appState, setAppState] = useState<ShardAppState>({nodes: []});
	const shardApp = useRef<ShardApp>(new ShardApp(setAppState));
	const [isRunning, setIsRunning] = useState(false);
	const [rowsToInsert, setRowsToInsert] = useState('1');
	const intervalID = useRef<NodeJS.Timer>();
	const [insertInterval, setInsertInterval] = useState('Once');
	const [modalOpen, setModalOpen] = useState(false);
	const [modalData, setModalData] = useState<any[]>([]);
	const [helpOpen, setHelpOpen] = useState(false);

	const rowOptions = ['1', '5', '10', '50'];
	const intervalOptions = ['Once', '0.1s', '0.5s', '1s', '3s'];
	// const partitionSizeOptions = ['1', '5', '10', '20'];

	useEffect(() => {setAppState(shardApp.current.getState())}, []);

	const resetApp = () => {
		pause();
		ndx.current = 0;
		shardApp.current.reset();
	}

	const handlePlayClick = () => {
		(isRunning) ?	pause() :	play();
	}

	const play = () => {
		if (insertInterval === 'Once') {
			insertData();
			return;
		} else {
			const ms = 1000 * parseFloat(insertInterval.substring(0, insertInterval.length - 1));
			intervalID.current = setInterval(insertData, ms);
			setIsRunning(true);
		}
	}

	const pause = () => {
		clearInterval(intervalID.current);
		setIsRunning(false);
	}

	const insertData = () => {
		let rowsLeft = parseInt(rowsToInsert, 10);
		if (ndx.current >= data.length) {
			alert("No more data to insert");
			return;
		}

		while (ndx.current < data.length && rowsLeft) {
			shardApp.current.insert(data[ndx.current]);
			ndx.current++;
			rowsLeft--;
		}
	}

	// Pause application while modal is open
	const displayPartitionData = (p: Partition) => {
		pause();
		setModalOpen(true);
		setModalData(p.data);
	}

	const addNode = () => {
		shardApp.current.createNode()
		setAppState(shardApp.current.getState());
	}

	const deleteNode = (id: number) => {
		if (appState.nodes.length === 1) {
			alert("It's a good idea to have at least one node storing our data");
			return;
		}
		shardApp.current.deleteNode(id);
	}

	appState.nodes.forEach(node => node.partitions.sort((a, b) => a.minKey - b.minKey))

  return (
    <div className="app-container">
			<Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
				{(modalData.length) ? <DataList data={modalData} /> : "No data"}
			</Dialog>
			<Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="xl">
				<Help />
			</Dialog>
			<div className='heading'>
				<div className="name">
					<h2>Partitioning with Dynamic Rebalancing</h2>
					<h3>By Mahamadou Juwara</h3>
				</div>
				<IconButton aria-label="Reset" onClick={() => {setHelpOpen(true); pause();}}>
					<HelpIcon />
				</IconButton>
			</div>
			<div className="app">
				<div className="toolbar">
					<IconButton aria-label="Reset" onClick={resetApp}>
						<RestartAltIcon />
					</IconButton>
					<IconButton aria-label="Play-resume" onClick={() => handlePlayClick()}>
						{(isRunning) ? <PauseCircleIcon /> : <PlayCircleIcon />}
					</IconButton>
					<TextField
						select
						size='small'
						sx={{margin: 1, width: 115}}
						id="rows-to-insert"
						value={rowsToInsert}
						label="Rows to Insert"	// TODO: More succinct way to say this
						onChange={(e) => {setRowsToInsert(e.target.value); pause();}}
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
						onChange={(e) => {setInsertInterval(e.target.value); pause();}}
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
				<div className="nodes-container">
				{appState.nodes.map((node: Node, ndx: number) => (
					<div key={ndx} className="node">
						<div className="node-header">
							<h4>{`Node ${node.id}`}</h4>
							<IconButton size='small' aria-label="Delete" onClick={() => deleteNode(node.id)}>
								<ClearIcon />
							</IconButton>
						</div>
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
				<IconButton size="large" className="add-icon" onClick={addNode}>
					<AddIcon />
				</IconButton>
				</div>
    	</div>
		</div>
  );
}

const DataList = ({data}: {data: any[]}) => {
	return (
		<List>
			{data.map((d, n) => (
				<ListItem key={n}>
						<ListItemText primary={d.Name} />
				</ListItem>)
			)}
		</List>
	);
}

const Help = () => {
	return (
		<div className="help">
			<h3>What is partitioning with dynamic rebalancing?</h3>
			<Divider />
			<p><strong>Partitioning</strong> is splitting up your data into groups.</p>
			<p><strong>Dynamically rebalancing</strong> is to set a limit on the amount of data allowed in each group, splitting the partition if it gets too large and merging it with an adjacent partition if it gets too small.</p>
			<p>You may want to do this if:</p>
			<ul>
				<li>Your data is too large to be stored on a single computer</li>
				<li>To scale, balancing the load of queries across multiple servers</li>
				<li>For redundancy, </li>
			</ul>
			<br />

			<h3>Implementation:</h3>
			<Divider />
			<p>There are some number of nodes, each node is responsible for some number of partitions and each partition is responsible for some range of keys.</p>
			<p>When a piece of data (in this case, cars) gets inserted, the key for that piece of data is determined via a hash function.</p>
			<p>The key tells us which partition that piece of data will reside in.</p>
			<p>When a partition exceeds a certain size, it will be split in half.</p>
			<p>When a new node is introduced, the new node will take on partitions from existing nodes to balance the load.</p>
			<p>When a node is removed, it's partitions will be spread across the remaining nodes.</p>
			<br/>

			<h3>Controls</h3>
			<Divider />
			<p>The toolbar contains a:</p>
			<ul>
				<li><strong>Reset button</strong> to reset the state of the app</li>
				<li><strong>Play/Pause button</strong> continue/stop inserting data</li>
				<li><strong>Rows to Insert</strong> for the number of rows to insert</li>
				<li><strong>Frequency</strong> for how frequently to insert the specified number of rows</li>
			</ul>
			<p>Each node has:</p>
			<ul>
				<li>A name</li>
				<li>An "X" to remove that node from the cluster</li>
				<li>Buttons representing each partition stored on that node, click to view it's data</li>
			</ul>
		</div>
	);
}
export default App;
