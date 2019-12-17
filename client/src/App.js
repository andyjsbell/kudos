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
import TaskList from './components/TaskList';

import {getBytes32FromIpfsHash, getIpfsHashFromBytes32} from './utils/ipfshelper';
import * as Constants from './constants';

const IPFS = require('ipfs');

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

  render() {
    if (!this.state.web3) {
      return <div>Loading...</div>;
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