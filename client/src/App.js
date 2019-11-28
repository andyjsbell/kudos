import React, { Component, useState } from 'react';
import './App.css';
import getWeb3 from "./utils/getWeb3";
import 'semantic-ui-css/semantic.min.css';
// import { Button, Input } from 'semantic-ui-react';
import KudosToken from './contracts/KudosToken.json'
import Tasks from './contracts/Tasks.json'
// web3 https://github.com/ethereum/wiki/wiki/JavaScript-API
const Web3 = require('web3');

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
      </>
    );
  }
}

export default App;