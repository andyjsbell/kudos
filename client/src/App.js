import React, { Component, useState, useEffect } from 'react';
import './App.css';
import getWeb3 from "./utils/getWeb3";
import 'semantic-ui-css/semantic.min.css';
import { Table, Button, Input, Label, Form } from 'semantic-ui-react';
import KudosToken from './contracts/KudosToken.json';
import Tasks from './contracts/Tasks.json';
import UserRole from './contracts/UserRole.json';
import bs58 from 'bs58';
import ImageUploader from 'react-images-upload';
const IPFS = require('ipfs');
const IPFS_NODE_URL = 'https://ipfs.io/ipfs/';
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

const UserProfileForm = (props) => {
  const [name, setName] = useState('');
  const [picture, setPicture] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const account = props.accounts[0];

  const updateProfile = () => {

    setMessage('');

    if (name !== null && picture !== null) {
      props.ipfs.add(picture, (err, result) => {
        if (err) {
          setError(err.message);
        } else {
          
          const hash = result[0].hash;
          
          if (hash) {
            
            let content = {
              name,
              picture: hash
            };
            
            props.ipfs.add({path:'me.json', content:JSON.stringify(content)}, (err, result) => {
              
              if (err) {
                setError(err.message);
              } else {
                setMessage('Profile updated at ' + IPFS_NODE_URL + result[0].hash);
                props.user.updateUser(getBytes32FromIpfsHash(result[0].hash), {from:account}, (err, result) => {
                  if(err) {
                    setError(err.message);
                  } else {
                    setMessage('Written to chain');
                  }
                });
              }
            });

          } else {
            setError('Adding file failed in not returning a locator');
          }
        }
      });
    }
  };

  return (
    <>
      <h1>Update Profile</h1>
      <h3>{message}</h3>
      <h3>{error}</h3>
      <Form>
        <Form.Field>          
          <Label>Name</Label>
          <Input placeholder='Your name' 
                onChange={e => setName(e.target.value)} />
        </Form.Field>
        <Form.Field>          
          <Label>Avatar</Label>
          <ImageUploader
                withIcon={true}
                buttonText='Choose image for avatar'
                onChange={e => setPicture(e)}
                imgExtension={['.jpg', '.gif', '.png', '.gif']}
                maxFileSize={5242880} 
                singleImage={false}
                withPreview={true}/>
        </Form.Field>
        <Button primary onClick={() => updateProfile()}>Update Profile</Button>
      </Form>
    </>
  );
};

const Wallet = (props) => {
  const [balance, setBalance] = useState('0');
  const account = props.accounts[0];
  const [allowance, setAllowance] = useState('0');
  const [proposedIncreaseOfAllowance, setProposedIncreaseOfAllowance] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [picture, setPicture] = useState(null);

  useEffect(() => {
    props.kudos.balanceOf(account, function(err, result) {
      setBalance(result.toString());
    });

    props.kudos.allowance(account, props.tasks.address, function(err, result) {
      setAllowance(result.toString());
    });

    props.kudos.Approval({}, {fromBlock:0}).watch((err, result) => {
      
      if (err) {
        console.error(err);
      } else {
        setAllowance(result.args.value.toString());
      }
    });

    // Look up our user
    props.user.users(account, (err, result) => {
      if (err) {
        // Do nothing for the moment, maybe show a form
      } else {
        const url = IPFS_NODE_URL + getIpfsHashFromBytes32(result.toString());
        fetch(url)
          .then(response => {
            return response.json();
          })
          .then(data => {
            setName(data.name);
          });
      }
    });

  }, []);

  const updateAllowance = () => {
    
    if (proposedIncreaseOfAllowance > 0) {
      props.kudos.increaseAllowance(props.tasks.address, proposedIncreaseOfAllowance, {from: account}, function(err, result) {
        if(err) {
          setError(err.message);
        } else {
          setMessage('Allowance updated');
        }
      });
    }
  };

  return(
    <>
      <h1>Your Wallet</h1>
      <h4>Account: '{account}'</h4>
      <h4>Name: {name}</h4>
      <h4>Kudos: {balance} tokens</h4>
      <h4>Tasks Allowance: {allowance} tokens</h4>
      <h4>{error}</h4>
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
      <UserProfileForm {...props}/>
    </>
  );
};

const TaskList = (props) => {
  const [tasks, setTasks] = useState([]);
  let tmpTasks = [];
  useEffect(() => {

    props.tasks.TaskCreated({}, {fromBlock:0}).watch((err, result) => {
      
      const url = IPFS_NODE_URL + getIpfsHashFromBytes32(result.args.task);
      fetch(url)
        .then(response => {
          return response.json();
        })
        .then(data => {
          if (tmpTasks.some(t => t.id === result.args.task))
            return;
          
            tmpTasks = [...tmpTasks, 
            { id: result.args.task,
              value: data
            }];

          setTasks(tmpTasks);
        });
    });

  }, []);

  return(
    <>
    <h1>Tasks</h1>
    {tasks && tasks.length > 0 ?
      <Table celled striped>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Task</Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Description</Table.HeaderCell>
            <Table.HeaderCell>Kudos</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tasks.map(row => (
            <Table.Row key={row.id}>
              <Table.Cell align="left"><a href={IPFS_NODE_URL + getIpfsHashFromBytes32(row.id)}>{row.value.id}</a></Table.Cell>
              <Table.Cell align="left">{row.value.name}</Table.Cell>
              <Table.Cell align="left">{row.value.description}</Table.Cell>
              <Table.Cell align="left">{row.value.kudos}</Table.Cell>
              <Table.Cell align="left">{new Date(row.value.timestamp).toDateString()}</Table.Cell>
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

        setError(err.message);
      
      } else {
        
        setMessage('Allowance checked');
        
        props.tasks.nextTask.call((err, result) => {
          
          const content = {
            v: 1,
            id: result.toString(),
            name,
            description,
            kudos,
            timestamp: Date.now(),
          };

          props.ipfs.add({path:'kudos.json', content:JSON.stringify(content)}, (err, result) => {
          
            if (err) {
              
              setError(err.message);
  
            } else {
              
              setMessage('Task stored');
  
              const id = getBytes32FromIpfsHash(result[0].hash);
              props.tasks.createTask(id, kudos, {from: account}, (err, result) => {
              
                if(err) {
              
                  setError(err.message);
              
                } else {
              
                  setMessage('Task \'' + name + '\' created');            
                }
              });
            }
          });
        });
      }
    });
  };

  const validateKudos = (kudos) => {
    props.kudos.allowance(account, props.tasks.address, function(err, result) {
      const currentAllowance = parseInt(result.toString());
      if (parseInt(kudos) < currentAllowance) {
        setKudos(kudos);
        setError('');
      } else {
        setError('Check your allowance');
      } 
    });
  };
  return (
    <>
      <h1>Task Entry:</h1>
      <h4>{error}</h4>
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
          <Input placeholder='Number of Kudos' onChange={e => validateKudos(e.target.value)} type='number'></Input>
        </Form.Field>
        <Button primary disabled={error} onClick={() => createTask()}>Create Task</Button>
      </Form>
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