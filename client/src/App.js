import React, { Component, useState, useEffect } from 'react';
import './App.css';
import getWeb3 from "./utils/getWeb3";
import 'semantic-ui-css/semantic.min.css';
import { Table, Button, Input, Label, Form } from 'semantic-ui-react';
import KudosToken from './contracts/KudosToken.json'
import Tasks from './contracts/Tasks.json'
// web3 https://github.com/ethereum/wiki/wiki/JavaScript-API
const Web3 = require('web3');

const Wallet = (props) => {
  const [balance, setBalance] = useState('0');
  const account = props.accounts[0];
  
  useEffect(() => {
    props.kudos.balanceOf(account, function(error, result) {
      setBalance(result.toString());
    });
  }, []);

  return(
    <>
      <h1>Wallet</h1>
      <h4>Account: '{account}'</h4>
      <h4>Your Kudos balance is: {balance} tokens</h4>
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

  return (
    <>
      <h1>Task Entry:</h1>
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
        <Button primary>Add Task</Button>
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
      // Workaround for compatibility between web3 and truffle-contract
      Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;	
      
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