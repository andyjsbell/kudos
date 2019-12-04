import React, { useState, useEffect } from 'react';
import { Button, Input, Label, Form} from 'semantic-ui-react';
import ImageUploader from 'react-images-upload';
const {getBytes32FromIpfsHash, getIpfsHashFromBytes32} = './utils/ipfshelper';
const {IPFS_NODE_URL} = '../constants';

const UserProfileForm = (props, update) => {
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
                      if(props.profileUpdated) {
                        props.profileUpdated(name, hash);
                      }
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

  export default UserProfileForm;