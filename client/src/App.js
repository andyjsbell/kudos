import React, { Component, useState, useEffect } from 'react';
import './App.css';
import getWeb3 from "./utils/getWeb3";
import 'semantic-ui-css/semantic.min.css';
import { Table, Button, Input, Label, Form } from 'semantic-ui-react';
import KudosToken from './contracts/KudosToken.json';
import Tasks from './contracts/Tasks.json';
import bs58 from 'bs58';
const IPFS = require('ipfs');

// Return bytes32 hex string from base58 encoded ipfs hash,
// stripping leading 2 bytes from 34 byte IPFS hash
// Assume IPFS defaults: function:0x12=sha2, size:0x20=256 bits
// E.g. "QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL" -->
// "0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231"

function getBytes32FromIpfsHash(ipfsListing) {
  return "0x"+bs58.decode(ipfsListing).slice(2).toString('hex')
}

// Return base58 encoded ipfs hash from bytes32 hex string,
// E.g. "0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231"
// --> "QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL"

function getIpfsHashFromBytes32(bytes32Hex) {
  // Add our default ipfs values for first 2 bytes:
  // function:0x12=sha2, size:0x20=256 bits
  // and cut off leading "0x"
  const hashHex = "1220" + bytes32Hex.slice(2)
  const hashBytes = Buffer.from(hashHex, 'hex');
  const hashStr = bs58.encode(hashBytes)
  return hashStr
}

const Wallet = (props) => {
  const [balance, setBalance] = useState('0');
  const account = props.accounts[0];
  const [allowance, setAllowance] = useState('0');
  const [proposedIncreaseOfAllowance, setProposedIncreaseOfAllowance] = useState(0);
  const [ipfsVersion, setIpfsVersion] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    props.kudos.balanceOf(account, function(err, result) {
      setBalance(result.toString());
    });

    props.kudos.allowance(account, props.tasks.address, function(err, result) {
      setAllowance(result.toString());
    });

    props.ipfs.version(function(err, result) {
      setIpfsVersion(result.version);
    });

    props.kudos.Approval({}, {fromBlock:0}).watch((err, result) => {
      
      if (err) {
        console.error(err);
      } else {
        setAllowance(result.args.value.toString());
      }
    });
  }, []);

  const updateAllowance = () => {
    
    if (proposedIncreaseOfAllowance > 0) {
      props.kudos.increaseAllowance(props.tasks.address, proposedIncreaseOfAllowance, {from: account}, function(err, result) {
        if(error) {
          setError(error);
        } else {
          setMessage('Allowance updated');
        }
      });
    }
  };

  return(
    <>
      <h1>Wallet</h1>
      <h4>Account: '{account}'</h4>
      <h4>IPFS version: {ipfsVersion}</h4>
      <h4>Your Kudos balance is: {balance} tokens</h4>
      <h4>Tasks has an allowance of: {allowance} tokens</h4>
      <h4>{error.message}</h4>
      <h4>{message}</h4>
      <Form>
        <Form.Field>
          <Label>Kudos</Label>
          <Input placeholder='Number of Kudos' 
                onChange={e => setProposedIncreaseOfAllowance(e.target.value)} 
                type='number'/>
        </Form.Field>
        <Button primary onClick={() => updateAllowance()}>Update Allowance</Button>
      </Form>
    </>
  );
};

const TaskList = (props) => {
  const [tasks, setTasks] = useState([]);
  let tmpTasks = [];
  useEffect(() => {

    props.tasks.TaskCreated({}, {fromBlock:0}).watch((err, result) => {
      
      tmpTasks = [...tmpTasks, 
                  { id: tmpTasks.length,
                    value: {  
                      task: result.args.task, 
                      owner: result.args.owner,
                      tokens: result.args.tokens.toString()
                    }
                  }];
      
      setTasks(tmpTasks);
    });

  }, []);

  return(
    <>
    <h1>Tasks</h1>
    {tasks && tasks.length > 0 ?
      <Table celled>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Task</Table.HeaderCell>
            <Table.HeaderCell>Owner</Table.HeaderCell>
            <Table.HeaderCell>Tokens</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tasks.map(row => (
            <Table.Row key={row.id}>
              <Table.Cell align="left"><a href={'https://ipfs.io/ipfs/' + getIpfsHashFromBytes32(row.value.task)}>{row.value.task}</a></Table.Cell>
              <Table.Cell align="left">{row.value.owner}</Table.Cell>
              <Table.Cell align="left">{row.value.tokens}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    : null}
    </>
  );
};

const TaskEntry = (props) => {
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kudos, setKudos] = useState(0);
  const account = props.accounts[0];
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const createTask = () => {
    
    props.kudos.allowance(account, props.tasks.address, {from: account}, (err, result) => {
      
      if (err) {

        setError(err);
      
      } else {
        
        setMessage('Allowance checked');
        
        const content = {
          name,
          description,
          kudos
        };

        props.ipfs.add({path:'kudos.json', content:JSON.stringify(content)}, (err, result) => {
          
          if (err) {
            
            setError(err);

          } else {
            
            setMessage('Task stored');

            const id = getBytes32FromIpfsHash(result[0].hash);
            props.tasks.createTask(id, kudos, {from: account}, (err, result) => {
            
              if(err) {
            
                setError(err);
            
              } else {
            
                setMessage('Task \'' + name + '\' created');            
              }
            });
          }
        });
      }
    });
  };

  return (
    <>
      <h1>Task Entry:</h1>
      <h4>{error.message}</h4>
      <h4>{message}</h4>
      <Form>
        <Form.Field>
          <Label>Name</Label>
          <Input placeholder='Name for the task' onChange={e => setName(e.target.value)}></Input>
        </Form.Field>
        <Form.Field>
          <Label>Description</Label>
          <Input placeholder='Description for the task' onChange={e => setDescription(e.target.value)}></Input>
        </Form.Field>
        <Form.Field>
          <Label>Kudos</Label>
          <Input placeholder='Number of Kudos' onChange={e => setKudos(e.target.value)} type='number'></Input>
        </Form.Field>
        <Button primary onClick={() => createTask()}>Create Task</Button>
      </Form>
    </>
  );
};

class App extends Component {

  state = {web3: null, accounts: [], kudos: null, tasks: null, ipfs: null};
  
  handleChange(event, newValue) {
    this.setState({value: newValue});
  }

  componentDidMount = async () => {
    try {
      
      const web3 = await getWeb3();
      const accounts = await web3.eth.accounts;
      const networkId = await web3.version.network;
      const kudosTokenDeployedNetwork = KudosToken.networks[networkId];
      const tasksDeployedNetwork = Tasks.networks[networkId];
      const kudosTokenContract  = web3.eth.contract(KudosToken.abi);
      const kudosInstance = kudosTokenContract.at(kudosTokenDeployedNetwork.address);
      const tasksContract  = web3.eth.contract(Tasks.abi);
      const tasksInstance = tasksContract.at(tasksDeployedNetwork.address);
      const node = await IPFS.create();
      
      this.setState({ web3:web3, 
                      accounts:accounts, 
                      kudos:kudosInstance, 
                      tasks:tasksInstance,
                      ipfs: node});
      
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );

      console.error(error);
    }
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contracts...</div>;
    }
    
    return (
      <>
        <h1>Welcome to Kudos!</h1>
        <Wallet {...this.state}/>
        <TaskEntry {...this.state}/>
        <TaskList {...this.state}/>
      </>
    );
  }
}

export default App;