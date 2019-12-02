#!/usr/local/bin/node
var repl = require("repl");
var context = repl.start("$ ").context;

(async function () {
    const Web3 = require('web3');
    const IPFS = require('ipfs');

    const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    const KudosToken = require('./src/contracts/KudosToken.json');
    const Tasks = require('./src/contracts/Tasks.json');

    const accounts = web3.eth.accounts;
    const networkId = web3.version.network;
    const kudosTokenDeployedNetwork = KudosToken.networks[networkId];
    const tasksDeployedNetwork = Tasks.networks[networkId];
    const kudosTokenContract  = web3.eth.contract(KudosToken.abi);
    const kudosInstance = kudosTokenContract.at(kudosTokenDeployedNetwork.address);
    const tasksContract  = web3.eth.contract(Tasks.abi);
    const tasksInstance = tasksContract.at(tasksDeployedNetwork.address);
    const node = await IPFS.create();

    // tasksInstance.TaskCreated({}, {fromBlock:0}).watch((err, result) => {
    //     console.log(result);
    // });
    // kudosInstance.approve(tasksInstance.address, 2000, {from:accounts[0]});
    // tasksInstance.createTask(web3.sha3('task2'), 10, {from: accounts[0]});

    context.web3 = web3;
    context.accounts = accounts;
    context.kudosInstance = kudosInstance;
    context.tasksInstance = tasksInstance;
    context.node = node;
}());