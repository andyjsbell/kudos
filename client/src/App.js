import React, { Component, useState, useEffect } from 'react';
import './App.css';
import getWeb3 from "./utils/getWeb3";
import 'semantic-ui-css/semantic.min.css';
import { Table, Button, Input, Label, Form, Image } from 'semantic-ui-react';
import KudosToken from './contracts/KudosToken.json';
import Tasks from './contracts/Tasks.json';
import UserRole from './contracts/UserRole.json';
import Wallet from './components/Wallet';
import TaskEntry from './components/TaskEntry';
import {getBytes32FromIpfsHash, getIpfsHashFromBytes32} from './utils/ipfshelper';
import * as Constants from './constants';

const IPFS = require('ipfs');

const TaskList = (props) => {
  const [tasks, setTasks] = useState([]);
  let tmpTasks = [];
  const [account] = props.accounts;
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  useEffect(() => {

    props.tasks.TaskCreated({}, {fromBlock:0}).watch((err, result) => {
      
      const url = Constants.IPFS_NODE_URL + getIpfsHashFromBytes32(result.args.task);
      fetch(url)
        .then(response => {
          return response.json();
        })
        .then(data => {
          if (tmpTasks.some(t => t.id === result.args.task))
            return;

          props.user.users(
            result.args.owner, 
            {from:account}, 
            (err, userResult) => {
            
              if (!err) { 
                if (parseInt(userResult) === 0) {
                  data.owner = result.args.owner;
                  tmpTasks = [...tmpTasks, 
                    { id: result.args.task,
                      value: data
                    }];

                  setTasks(tmpTasks);
                } else {
                  const url = Constants.IPFS_NODE_URL + getIpfsHashFromBytes32(userResult.toString());
                  
                  fetch(url)
                    .then(response => {
                      return response.json();
                    })
                    .then(jsonData => {
                      data.owner = result.args.owner;
                      data.ownerName = jsonData.name;
                      data.picture = jsonData.picture;
                      tmpTasks = [...tmpTasks, 
                      { id: result.args.task,
                        value: data
                      }];

                      setTasks(tmpTasks);
                  });
                }
              }  
          });
        });
    });

  }, []);

  const hunt = (task) => {
    props.tasks.addHunter(
      task, 
      {from:account}, 
      (err, result) => {

        if (err) {
          setError(err.message);
        } else {
          setMessage('You are hunting ', task);
        }
    });
  };

  return(
    <>
    <h1>Tasks</h1>
    <h4>{error}</h4>
    <h4>{message}</h4>
    {tasks && tasks.length > 0 ?
      <Table celled striped>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Task</Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Description</Table.HeaderCell>
            <Table.HeaderCell>Kudos</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
            <Table.HeaderCell>Owner</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tasks.map(row => (
            <Table.Row key={row.id}>
              <Table.Cell align="left"><a href={Constants.IPFS_NODE_URL + getIpfsHashFromBytes32(row.id)}>{row.value.id}</a></Table.Cell>
              <Table.Cell align="left">{row.value.name}</Table.Cell>
              <Table.Cell align="left">{row.value.description}</Table.Cell>
              <Table.Cell align="left">{row.value.kudos}</Table.Cell>
              <Table.Cell align="left">{new Date(row.value.timestamp).toDateString()}</Table.Cell>
              <Table.Cell align="left">{row.value.ownerName}</Table.Cell>
              <Table.Cell align="left">
                  <Button 
                    secondary 
                    disabled={row.value.owner === account} 
                    onClick={() => hunt(row.id)}>
                      Hunt me!
                  </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    : null}
    </>
  );
};

class App extends Component {

  state = { 
            web3: null, 
            accounts: [], 
            kudos: null, 
            tasks: null, 
            ipfs: null, 
            user: null
          };
  
  handleChange(event, newValue) {
    this.setState({value: newValue});
  }

  componentDidMount = async () => {
    try {
      
      // getIpfsHashFromBytes32('hello');  
      const web3 = await getWeb3();
      const accounts = await web3.eth.accounts;
      const networkId = await web3.version.network;
      const kudosTokenDeployedNetwork = KudosToken.networks[networkId];
      const tasksDeployedNetwork = Tasks.networks[networkId];
      const userRoleDeployedNetwork = UserRole.networks[networkId];
      const kudosTokenContract  = web3.eth.contract(KudosToken.abi);
      const kudosInstance = kudosTokenContract.at(kudosTokenDeployedNetwork.address);
      const tasksContract  = web3.eth.contract(Tasks.abi);
      const tasksInstance = tasksContract.at(tasksDeployedNetwork.address);
      const userRoleContract  = web3.eth.contract(UserRole.abi);
      const userRoleInstance = userRoleContract.at(userRoleDeployedNetwork.address);
      const node = await IPFS.create();
      
      this.setState({ web3:web3, 
                      accounts:accounts, 
                      kudos:kudosInstance, 
                      tasks:tasksInstance,
                      user:userRoleInstance,
                      ipfs: node});
      
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );

      console.error(error);
    }
  };

  f() {
    console.log('hello');
  }

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contracts...</div>;
    }
    
    const update = () => this.f();
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