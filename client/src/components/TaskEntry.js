import React, {useState} from 'react';
import { Button, Input, Label, Form} from 'semantic-ui-react';
import {getBytes32FromIpfsHash} from '../utils/ipfshelper';

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

export default TaskEntry;