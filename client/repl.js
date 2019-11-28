#!/usr/local/bin/node
var repl = require("repl");
var context = repl.start("$ ").context;

const Web3 = require('web3');

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

context.web3 = web3;
context.accounts = accounts;
context.kudosInstance = kudosInstance;
context.tasksInstance = tasksInstance;