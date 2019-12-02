import React, { Component, useState, useEffect } from 'react';
import './App.css';
import getWeb3 from "./utils/getWeb3";
import 'semantic-ui-css/semantic.min.css';
import { Table, Button, Input, Label, Form } from 'semantic-ui-react';
import KudosToken from './contracts/KudosToken.json';
import Tasks from './contracts/Tasks.json';
//const IPFS = require('ipfs');
// web3 https://github.com/ethereum/wiki/wiki/JavaScript-API

const Wallet = (props) => {
  const [balance, setBalance] = useState('0');
  const account = props.accounts[0];
  const [allowance, setAllowance] = useState('0');
  const [proposedIncreaseOfAllowance, setProposedIncreaseOfAllowance] = useState('0');
  
  useEffect(() => {
    props.kudos.balanceOf(account, function(error, result) {
      setBalance(result.toString());
    });

    props.kudos.allowance(account, props.tasks.address, function(error, result) {
      setAllowance(result.toString());
    });

  }, []);

  const updateAllowance = () => {
    props.kudos.increaseAllowance(props.tasks.address, parseInt(proposedIncreaseOfAllowance), {from: account}, function(error, result) {
      if(error) {
        console.log(error);
      } else {
        props.kudos.allowance(account, props.tasks.address, function(error, result) {
          setAllowance(result.toString());
        });
      }
    });
  };

  return(
    <>
      <h1>Wallet</h1>
      <h4>Account: '{account}'</h4>
      <h4>Your Kudos balance is: {balance} tokens</h4>
      <h4>Tasks has an allowance of: {allowance} tokens</h4>
      <Form>
        <Form.Field>
          <Label>Kudos</Label>
          <Input placeholder='Number of Kudos' onChange={e => setProposedIncreaseOfAllowance(e.target.value)}></Input>
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
              <Table.Cell align="left">{row.value.task}</Table.Cell>
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
        // TODO Create off chain meta information, IPFS
        const id = props.web3.sha3(name);

        props.tasks.createTask(id, kudos, {from: account}, (err, result) => {
        
          if(err) {
        
            setError(err);
        
          } else {
        
            setMessage('Task \'' + name + '\' created');            
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
          <Input placeholder='Number of Kudos' onChange={e => setKudos(e.target.value)}></Input>
        </Form.Field>
        <Button primary onClick={() => createTask()}>Create Task</Button>
      </Form>
    </>
  );
};

class App extends Component {

  state = {web3: null, accounts: [], kudos: null, tasks: null};
  
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

      this.setState({ web3:web3, 
                      accounts:accounts, 
                      kudos:kudosInstance, 
                      tasks:tasksInstance });
      
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