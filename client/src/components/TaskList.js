import React, { useState, useEffect } from 'react';
import { Button, Table} from 'semantic-ui-react';
import {getIpfsHashFromBytes32} from '../utils/ipfshelper';
import * as Constants from '../constants';

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

  export default TaskList;