import React, { useState, useEffect } from 'react';
import { Button, Input, Label, Form, Image } from 'semantic-ui-react';
import UserProfileForm from './UserProfileForm';
const {getBytes32FromIpfsHash, getIpfsHashFromBytes32} = '../utils/ipfshelper';
const {IPFS_NODE_URL} = '../constants';

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
                setPicture(data.picture);
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

    const profileUpdated  = (name, picture) => {
        setName(name);
        setPicture(picture);
    };

    return(
        <>
        <h1>Your Wallet</h1>
        <h4>Account: '{account}'</h4>
        <h4>Name: {name}</h4>
        <Image src={IPFS_NODE_URL + picture} size='small' />
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
        <UserProfileForm
            {...{...props, profileUpdated}}/>
        </>
    );
};

export default Wallet;